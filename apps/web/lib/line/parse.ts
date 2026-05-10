import { z } from 'zod';

const lineSourceSchema = z.object({
  type: z.enum(['user', 'group', 'room']),
  userId: z.string().optional(),
  groupId: z.string().optional(),
  roomId: z.string().optional(),
});

const lineMessageSchema = z.object({
  id: z.string(),
  type: z.enum(['text', 'image', 'video', 'audio', 'file', 'location', 'sticker']),
  text: z.string().optional(),
});

const lineEventSchema = z.object({
  type: z.string(),
  timestamp: z.number(),
  source: lineSourceSchema,
  message: lineMessageSchema.optional(),
  replyToken: z.string().optional(),
});

export const lineWebhookBodySchema = z.object({
  destination: z.string(),
  events: z.array(lineEventSchema),
});

export type LineEvent = z.infer<typeof lineEventSchema>;
export type LineWebhookBody = z.infer<typeof lineWebhookBodySchema>;

export type LineConfig = {
  channelSecret: string;
  channelAccessToken: string;
};

export function parseLineConfig(raw: unknown): LineConfig | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const channelSecret = typeof r.channelSecret === 'string' ? r.channelSecret : null;
  const channelAccessToken = typeof r.channelAccessToken === 'string' ? r.channelAccessToken : null;
  if (!channelSecret || !channelAccessToken) return null;
  return { channelSecret, channelAccessToken };
}
