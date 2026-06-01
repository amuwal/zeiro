import 'server-only';
import { z } from 'zod';

const optionalString = z.preprocess(
  (v) => (v === '' || v == null ? undefined : v),
  z.string().min(1).optional(),
);

const optionalUrl = z.preprocess(
  (v) => (v === '' || v == null ? undefined : v),
  z.string().url().optional(),
);

const schema = z.object({
  DATABASE_URL: z.string().url(),
  AGENTS_BASE_URL: z.string().url(),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  CLERK_SECRET_KEY: z.string().min(1),
  CLERK_WEBHOOK_SECRET: z.string().min(1),
  OUTBOUND_FROM_DOMAIN: z.string().min(1).default('reply.zeiro.io'),
  ENCRYPTION_KEY: z.string().regex(/^[0-9a-fA-F]{64}$/, 'must be 64 hex chars (32 bytes)'),
  ANTHROPIC_API_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
  FREEE_CLIENT_ID: optionalString,
  FREEE_CLIENT_SECRET: optionalString,
  FREEE_REDIRECT_URI: optionalString,
  CHATWORK_CLIENT_ID: optionalString,
  CHATWORK_CLIENT_SECRET: optionalString,
  CHATWORK_REDIRECT_URI: optionalUrl,
  RESEND_API_KEY: optionalString,
  RESEND_INBOUND_WEBHOOK_SECRET: optionalString,
  RESEND_EVENT_WEBHOOK_SECRET: optionalString,
  INNGEST_EVENT_KEY: optionalString,
  INNGEST_SIGNING_KEY: optionalString,
  SENTRY_DSN: optionalUrl,
  NEXT_PUBLIC_SENTRY_DSN: optionalUrl,
});

export const env = schema.parse(process.env);
