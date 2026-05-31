import './lib/env-loader';
import './lib/sentry';
import './lib/integrations-bootstrap';
import { serve } from '@hono/node-server';
import { RequestContext } from '@mastra/core/di';
import { chatPostSchema, TenantIsolationError } from '@zeiro/core';
import { logger } from '@zeiro/core/logger';
import { FIRM_TOKEN_HEADER, selfTestVector, verifyFirmTokenFor } from '@zeiro/core/security';
import { getInquiry } from '@zeiro/db';
import { Hono } from 'hono';
import { loadChatHistory } from './lib/chat-history';
import {
  type InquiryStatus,
  persistChatTerminal,
  readTerminalToolResult,
  TERMINAL_REGISTRY_KEYS,
} from './lib/chat-persist';
import { buildChatUserMessage } from './lib/chat-prompt';
import { chunkToEvent, encodeSSE } from './lib/chat-stream';
import { agentLogger, bindAgentFirm } from './lib/request-context';
import { requestIdMiddleware } from './lib/request-id-middleware';
import { runInquiry } from './lib/run-inquiry';
import { inquiryAgent } from './mastra/agents/inquiry';
import { pipelineInputSchema } from './mastra/schemas';
import './mastra';

// Resilience: a transient Neon connection drop (serverless resume) can surface
// as an unhandled rejection deep inside Mastra's pg store init. Don't let one
// async blip take down the whole container — log it and keep serving; the
// affected request still fails via its own handler.
process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'unhandledRejection');
});

const PORT = Number(process.env.PORT ?? 6002);

const app = new Hono();

app.use('*', requestIdMiddleware);

// `firmTokenKey` MUST equal the web service's /api/health value — a mismatch
// means a divergent ENCRYPTION_KEY, which silently 401s every draft + chat.
app.get('/api/health', (c) => {
  let firmTokenKey: string | null;
  try {
    firmTokenKey = selfTestVector('firm-token');
  } catch {
    firmTokenKey = null;
  }
  return c.json({ ok: true, firmTokenKey });
});

app.post('/api/inquiries/run', async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return c.json({ error: 'json body required' }, 400);
  }
  const parsed = pipelineInputSchema.safeParse((body as { input?: unknown }).input);
  if (!parsed.success) {
    return c.json({ error: 'invalid input', issues: parsed.error.issues }, 400);
  }
  // The body-supplied firmId is untrusted. Verify the signed token and derive
  // firmId FROM it; reject if the body tried to act on a different firm.
  let firmId: string;
  try {
    const claims = verifyFirmTokenFor(c.req.header(FIRM_TOKEN_HEADER), {
      firmId: parsed.data.firmId,
      ...(parsed.data.inquiryId ? { inquiryId: parsed.data.inquiryId } : {}),
    });
    firmId = claims.firmId;
  } catch (error) {
    if (error instanceof TenantIsolationError) return c.json({ error: error.message }, 401);
    throw error;
  }
  bindAgentFirm(firmId);
  try {
    const result = await runInquiry({ ...parsed.data, firmId });
    return c.json({ result });
  } catch (error) {
    // Never return error.message: an @ai-sdk APICallError or a Postgres error
    // embeds request/row content (subject, body, names) that would propagate
    // into the caller's thrown Error and onward to the Inngest dashboard /
    // Sentry — an off-jp-tokyo §38 egress. Return a stable code + the requestId
    // so a failure is correlated to the (PII-scrubbed) agents log line instead.
    const requestId = agentLogger().bindings().requestId as string | undefined;
    agentLogger().error({ err: error, route: 'inquiries.run' }, 'inquiry run failed');
    return c.json({ error: 'inquiry_run_failed', requestId }, 500);
  }
});

// Replay all prior chat turns for an inquiry. Mastra Memory stores them on the
// thread keyed by inquiry id, so we just normalise to our wire format.
app.get('/api/inquiries/:id/chat', async (c) => {
  const inquiryId = c.req.param('id');
  // firmId is derived from the signed token, NOT the query param. The query
  // param is treated as an untrusted hint and must match the token's claim.
  let firmId: string;
  try {
    const claims = verifyFirmTokenFor(c.req.header(FIRM_TOKEN_HEADER), {
      firmId: c.req.query('firmId'),
      inquiryId,
    });
    firmId = claims.firmId;
  } catch (error) {
    if (error instanceof TenantIsolationError) return c.json({ error: error.message }, 401);
    throw error;
  }
  bindAgentFirm(firmId);
  try {
    const messages = await loadChatHistory({ inquiryId, firmId });
    return c.json({ messages });
  } catch (error) {
    const requestId = agentLogger().bindings().requestId as string | undefined;
    agentLogger().error({ err: error, route: 'inquiries.chat.history' }, 'chat history failed');
    return c.json({ error: 'chat_history_failed', requestId }, 500);
  }
});

// Streams a single chat turn as SSE. The agent resumes the same Memory thread
// the inquiry pipeline used, so the model has the original draft context.
app.post('/api/inquiries/:id/chat', async (c) => {
  const inquiryId = c.req.param('id');
  // firmId is derived from the signed token, NOT the query param. This same
  // verified firmId becomes the Mastra memory `resource` below, so the agent's
  // thread (raw email bodies in the `mastra` schema) is keyed by a firmId that
  // can't be forged from the request.
  let firmId: string;
  try {
    const claims = verifyFirmTokenFor(c.req.header(FIRM_TOKEN_HEADER), {
      firmId: c.req.query('firmId'),
      inquiryId,
    });
    firmId = claims.firmId;
  } catch (error) {
    if (error instanceof TenantIsolationError) return c.json({ error: error.message }, 401);
    throw error;
  }
  bindAgentFirm(firmId);
  const body = await c.req.json().catch(() => null);
  const parsed = chatPostSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: 'invalid body', issues: parsed.error.issues }, 400);

  // Tools (get-client, lookup-freee-books, ...) read firmId/clientId from the
  // request context; without it they error out. Hydrate the same context the
  // inquiry pipeline uses so chat tool calls work identically.
  const inquiry = await getInquiry(firmId, inquiryId);
  if (!inquiry) return c.json({ error: 'inquiry not found' }, 404);
  const status = (inquiry.status ?? 'pending') as InquiryStatus;
  const requestContext = new RequestContext<{
    firmId: string;
    clientId: string | null;
    subject: string;
    body: string;
    currentStatus: InquiryStatus;
  }>([
    ['firmId', firmId],
    ['clientId', inquiry.clientId ?? null],
    ['subject', inquiry.subject],
    ['body', inquiry.body],
    // The terminal tools' state-guard reads this to refuse mutations on
    // already-sent inquiries.
    ['currentStatus', status],
  ]);

  const wrappedMessage = buildChatUserMessage({
    status,
    hasDraft: inquiry.status === 'drafted' || inquiry.status === 'sent',
    userMessage: parsed.data.message,
  });

  const stream = await inquiryAgent.stream(wrappedMessage, {
    requestContext,
    memory: { thread: inquiryId, resource: firmId },
    maxSteps: 8,
  });

  // Track which calls are terminal (by callId) so when their tool-result
  // arrives we can capture the payload for persistence. We persist only the
  // LAST terminal call (if the agent misbehaves and calls multiple).
  const terminalCallIds = new Map<string, keyof typeof TERMINAL_REGISTRY_KEYS>();
  let terminalPayload: { key: string; result: unknown } | null = null;

  // Capture the correlated logger now: the ReadableStream callbacks run after
  // this handler returns, outside the AsyncLocalStorage scope.
  const log = agentLogger();

  const sseStream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enc = new TextEncoder();
      try {
        for await (const chunk of stream.fullStream) {
          if (chunk.type === 'tool-call' && chunk.payload.toolName in TERMINAL_REGISTRY_KEYS) {
            terminalCallIds.set(
              chunk.payload.toolCallId,
              chunk.payload.toolName as keyof typeof TERMINAL_REGISTRY_KEYS,
            );
          }
          if (chunk.type === 'tool-result') {
            const key = terminalCallIds.get(chunk.payload.toolCallId);
            if (key) terminalPayload = { key, result: chunk.payload.result };
          }
          const event = chunkToEvent(chunk);
          if (event) controller.enqueue(enc.encode(encodeSSE(event)));
        }

        // Persist after stream completes (so memory has written all chunks).
        let newStatus: InquiryStatus | null = null;
        let newDraftId: string | undefined;
        if (terminalPayload) {
          const terminal = readTerminalToolResult(terminalPayload.key, terminalPayload.result);
          if (terminal) {
            const persisted = await persistChatTerminal({
              firmId,
              inquiryId,
              subject: inquiry.subject,
              currentStatus: status,
              terminal,
            });
            if (persisted) {
              newStatus = persisted.status;
              newDraftId = persisted.draftId;
            }
          }
        }

        controller.enqueue(enc.encode(encodeSSE({ type: 'done' })));
        if (newStatus) {
          controller.enqueue(
            enc.encode(
              encodeSSE({
                type: 'state-changed',
                status: newStatus,
                ...(newDraftId ? { draftId: newDraftId } : {}),
              }),
            ),
          );
        }
      } catch (err) {
        // err.message can embed the client subject/body/name from an upstream
        // LLM or DB error — don't stream it to the browser. Emit a stable code
        // + requestId; the scrubbed server log carries the detail.
        const requestId = log.bindings().requestId as string | undefined;
        log.error({ err, route: 'inquiries.chat.stream' }, 'chat stream failed');
        controller.enqueue(
          enc.encode(encodeSSE({ type: 'error', message: 'chat_stream_failed', requestId })),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(sseStream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
});

serve({ fetch: app.fetch, port: PORT }, (info) => {
  logger.info({ port: info.port }, 'zeiro-agents listening');
});
