import '../lib/sentry';
import { Mastra } from '@mastra/core';
import { LangfuseExporter } from '@mastra/langfuse';
import {
  DefaultExporter,
  Observability,
  SamplingStrategyType,
  SensitiveDataFilter,
} from '@mastra/observability';
import { inquiryAgent } from './agents/inquiry';
import { reflectorAgent } from './agents/reflector';
import { triageAgent } from './agents/triage';
import { createMastraStorage } from './storage';

// Mastra's pg store opens long-lived `pg` connections. On Neon's serverless
// (free) compute the DIRECT endpoint drops connections when the compute
// suspends/resumes — that crashed the container mid-init ("Connection
// terminated unexpectedly"). The POOLED endpoint (PgBouncer) tolerates it, so
// prefer MASTRA_DATABASE_URL (the -pooler host) when set.
const databaseUrl = process.env.MASTRA_DATABASE_URL ?? process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('MASTRA_DATABASE_URL or DATABASE_URL required for Mastra storage');

const exporters: Array<DefaultExporter | LangfuseExporter> = [new DefaultExporter()];
if (process.env.LANGFUSE_PUBLIC_KEY && process.env.LANGFUSE_SECRET_KEY) {
  exporters.push(
    new LangfuseExporter({
      publicKey: process.env.LANGFUSE_PUBLIC_KEY,
      secretKey: process.env.LANGFUSE_SECRET_KEY,
      baseUrl: process.env.LANGFUSE_HOST ?? 'https://cloud.langfuse.com',
    }),
  );
}

// SensitiveDataFilter scrubs common credential field names (token, secret,
// password, bearer, jwt, etc.) from span attributes/input/output BEFORE they
// reach any exporter. It does NOT redact JP-specific PII (My Number, names,
// addresses) — that still happens inside the app via redactPIIDeep before
// content is handed to the LLM in the first place.
export const mastra = new Mastra({
  agents: { inquiryAgent, triageAgent, reflectorAgent },
  storage: createMastraStorage(databaseUrl),
  observability: new Observability({
    configs: {
      default: {
        serviceName: 'zeiro-agents',
        sampling: { type: SamplingStrategyType.ALWAYS },
        exporters,
        spanOutputProcessors: [new SensitiveDataFilter()],
      },
    },
  }),
  bundler: {
    externals: true,
  },
});
