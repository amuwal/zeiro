import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string().url(),
  SENDGRID_INBOUND_WEBHOOK_SECRET: z.string().min(1),
  SENDGRID_API_KEY: z.string().min(1),
  SENDGRID_EVENT_WEBHOOK_PUBLIC_KEY: z.string().min(1),
  OUTBOUND_FROM_DOMAIN: z.string().min(1).default('reply.zeiro.jp'),
  AGENTS_BASE_URL: z.string().url(),
  CLERK_WEBHOOK_SECRET: z.string().min(1),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  CLERK_SECRET_KEY: z.string().min(1),
  INNGEST_EVENT_KEY: z.string().optional(),
  INNGEST_SIGNING_KEY: z.string().optional(),
  SENTRY_DSN: z.string().url().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
});

export const env = schema.parse(process.env);
