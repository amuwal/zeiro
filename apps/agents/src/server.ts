import './lib/env-loader';
import './lib/sentry';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { mastra } from './mastra';
import { pipelineInputSchema } from './mastra/schemas';

const PORT = Number(process.env.PORT ?? 6002);

const app = new Hono();

app.get('/api/health', (c) => c.json({ ok: true }));

app.post('/api/workflows/inquiry-pipeline/start-async', async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return c.json({ error: 'json body required' }, 400);
  }
  const parsed = pipelineInputSchema.safeParse((body as { inputData?: unknown }).inputData);
  if (!parsed.success) {
    return c.json({ error: 'invalid inputData', issues: parsed.error.issues }, 400);
  }
  const workflow = mastra.getWorkflow('inquiryPipeline');
  if (!workflow) return c.json({ error: 'workflow not found' }, 500);
  const run = await workflow.createRun();
  const result = await run.start({ inputData: parsed.data });
  if (result.status === 'success') {
    return c.json({ result: result.result });
  }
  return c.json({ error: 'workflow failed', status: result.status, raw: result }, 500);
});

serve({ fetch: app.fetch, port: PORT }, (info) => {
  // biome-ignore lint/suspicious/noConsole: server boot log
  console.log(`zeiro-agents listening on http://localhost:${info.port}`);
});
