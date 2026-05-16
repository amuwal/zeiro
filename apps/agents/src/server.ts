import './lib/env-loader';
import './lib/sentry';
import './lib/integrations-bootstrap';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { runInquiry } from './lib/run-inquiry';
import './mastra';
import { pipelineInputSchema } from './mastra/schemas';

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

serve({ fetch: app.fetch, port: PORT }, (info) => {
  // biome-ignore lint/suspicious/noConsole: server boot log
  console.log(`zeiro-agents listening on http://localhost:${info.port}`);
});
