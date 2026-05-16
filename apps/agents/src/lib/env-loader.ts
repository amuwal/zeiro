import { config } from 'dotenv';
import { z } from 'zod';

config({ path: '.env.local' });
config({ path: '.env' });

// Fail-fast schema. Required keys are LLM provider credentials that the
// triage / draft / reflector pipelines read at request time — if they're
// missing, the workflow throws deep inside an Inngest step and Inngest
// records it as a permanent failure with no automatic retry. Validating at
// boot turns "silent per-request failures forever" into "the process won't
// start until the operator fixes the env."
const schema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1, 'ANTHROPIC_API_KEY required for draft generation'),
  GOOGLE_GENERATIVE_AI_API_KEY: z
    .string()
    .min(1, 'GOOGLE_GENERATIVE_AI_API_KEY required for triage / reflector'),
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY required for knowledge embeddings'),
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),
  ENCRYPTION_KEY: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/, 'ENCRYPTION_KEY must be 64 hex chars (32 bytes)'),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  • ${i.path.join('.')}: ${i.message}`).join('\n');
  // Plain console.error rather than throwing: this runs at module-eval time
  // before any logger is wired, and we want the message visible in plain
  // `pnpm dev` output before the process exits.
  console.error(`\n[zeiro-agents] Missing required environment variables:\n${issues}\n`);
  process.exit(1);
}
