import '../lib/sentry';
import { Mastra } from '@mastra/core';
import { LangfuseExporter } from '@mastra/langfuse';
import { Observability } from '@mastra/observability';
import { reflectorAgent } from './agents/reflector';
import { triageAgent } from './agents/triage';
import { inquiryPipeline } from './workflows/inquiry-pipeline';

const langfuseExporters =
  process.env.LANGFUSE_PUBLIC_KEY && process.env.LANGFUSE_SECRET_KEY
    ? [
        new LangfuseExporter({
          publicKey: process.env.LANGFUSE_PUBLIC_KEY,
          secretKey: process.env.LANGFUSE_SECRET_KEY,
          baseUrl: process.env.LANGFUSE_HOST ?? 'https://cloud.langfuse.com',
        }),
      ]
    : [];

const observabilityConfig =
  langfuseExporters.length > 0
    ? new Observability({
        configs: {
          langfuse: {
            serviceName: 'zeiro-agents',
            exporters: langfuseExporters,
          },
        },
      })
    : null;

export const mastra = new Mastra({
  agents: { triageAgent, reflectorAgent },
  workflows: { inquiryPipeline },
  ...(observabilityConfig ? { observability: observabilityConfig } : {}),
  bundler: {
    externals: true,
  },
});
