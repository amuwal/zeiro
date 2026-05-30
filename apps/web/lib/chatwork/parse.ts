import { z } from 'zod';

// Chatwork webhook envelope for a single event. We only act on message_created.
// `from_account_id` lets us skip messages our own connected account posted
// (e.g. when a sent draft is echoed back), avoiding an ingest loop.
// https://developer.chatwork.com/docs/webhook
const chatworkEventSchema = z.object({
  message_id: z.string(),
  room_id: z.union([z.number(), z.string()]).transform((v) => String(v)),
  from_account_id: z.union([z.number(), z.string()]).transform((v) => String(v)),
  body: z.string(),
  send_time: z.number().optional(),
});

export const chatworkWebhookBodySchema = z.object({
  webhook_event_type: z.string(),
  webhook_event_time: z.number().optional(),
  webhook_event: chatworkEventSchema,
});

export type ChatworkWebhookBody = z.infer<typeof chatworkWebhookBodySchema>;

export type ChatworkConfig = {
  apiToken: string;
  webhookToken: string;
  // The connected Chatwork account's own id — messages it sends are not ingested.
  botAccountId: string;
};

export function parseChatworkConfig(raw: unknown): ChatworkConfig | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const apiToken = typeof r.apiToken === 'string' ? r.apiToken : null;
  const webhookToken = typeof r.webhookToken === 'string' ? r.webhookToken : null;
  const botAccountId = typeof r.botAccountId === 'string' ? r.botAccountId : '';
  if (!apiToken || !webhookToken) return null;
  return { apiToken, webhookToken, botAccountId };
}
