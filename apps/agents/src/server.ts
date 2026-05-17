import './lib/env-loader';
import './lib/sentry';
import './lib/integrations-bootstrap';
import { serve } from '@hono/node-server';
import { RequestContext } from '@mastra/core/di';
import { chatPostSchema } from '@zeiro/core';
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
import { runInquiry } from './lib/run-inquiry';
import { inquiryAgent } from './mastra/agents/inquiry';
import { pipelineInputSchema } from './mastra/schemas';
import './mastra';

const PORT = Number(process.env.PORT ?? 6002);

const app = new Hono();

app.get('/api/health', (c) => c.json({ ok: true }));

app.post('/api/inquiries/run', async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return c.json({ error: 'json body required' }, 400);
  }
  const parsed = pipelineInputSchema.safeParse((body as { input?: unknown }).input);
  if (!parsed.success) {
    return c.json({ error: 'invalid input', issues: parsed.error.issues }, 400);
  }
  try {
    const result = await runInquiry(parsed.data);
    return c.json({ result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return c.json({ error: 'inquiry run failed', message }, 500);
  }
});

// Replay all prior chat turns for an inquiry. Mastra Memory stores them on the
// thread keyed by inquiry id, so we just normalise to our wire format.
app.get('/api/inquiries/:id/chat', async (c) => {
  const inquiryId = c.req.param('id');
  const firmId = c.req.query('firmId');
  if (!firmId) return c.json({ error: 'firmId required' }, 400);
  try {
    const messages = await loadChatHistory({ inquiryId, firmId });
    return c.json({ messages });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return c.json({ error: 'chat history failed', message }, 500);
  }
});

// Streams a single chat turn as SSE. The agent resumes the same Memory thread
// the inquiry pipeline used, so the model has the original draft context.
app.post('/api/inquiries/:id/chat', async (c) => {
  const inquiryId = c.req.param('id');
  const firmId = c.req.query('firmId');
  if (!firmId) return c.json({ error: 'firmId required' }, 400);
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
          if (chunk.type === 'tool-result' && terminalCallIds.has(chunk.payload.toolCallId)) {
            const key = terminalCallIds.get(chunk.payload.toolCallId)!;
            terminalPayload = { key, result: chunk.payload.result };
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
        const message = err instanceof Error ? err.message : String(err);
        controller.enqueue(enc.encode(encodeSSE({ type: 'error', message })));
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
  // biome-ignore lint/suspicious/noConsole: server boot log
  console.log(`zeiro-agents listening on http://localhost:${info.port}`);
});
