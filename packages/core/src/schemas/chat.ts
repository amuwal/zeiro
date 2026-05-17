import { z } from 'zod';

/** Normalised chat message part. Either a text/reasoning block (with full
 * accumulated text) or a tool call (with paired result if already returned). */
export const chatPartSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('text'), text: z.string() }),
  z.object({ type: z.literal('reasoning'), text: z.string() }),
  z.object({
    type: z.literal('tool-call'),
    callId: z.string(),
    name: z.string(),
    input: z.unknown().optional(),
    output: z.unknown().optional(),
    error: z.string().optional(),
  }),
]);
export type ChatPart = z.infer<typeof chatPartSchema>;

export const chatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant']),
  createdAt: z.string(),
  parts: z.array(chatPartSchema),
});
export type ChatMessage = z.infer<typeof chatMessageSchema>;

/** Wire format for one SSE event during a streaming chat turn. */
export const chatStreamEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('text-delta'), delta: z.string() }),
  z.object({ type: z.literal('text-end') }),
  z.object({ type: z.literal('reasoning-delta'), delta: z.string() }),
  z.object({ type: z.literal('reasoning-end') }),
  z.object({
    type: z.literal('tool-call'),
    callId: z.string(),
    name: z.string(),
    input: z.unknown().optional(),
  }),
  z.object({
    type: z.literal('tool-result'),
    callId: z.string(),
    output: z.unknown().optional(),
    error: z.string().optional(),
  }),
  z.object({ type: z.literal('done') }),
  z.object({ type: z.literal('error'), message: z.string() }),
  z.object({
    type: z.literal('state-changed'),
    status: z.enum(['pending', 'drafted', 'sent', 'escalated', 'rejected']),
    draftId: z.string().optional(),
  }),
]);
export type ChatStreamEvent = z.infer<typeof chatStreamEventSchema>;

export const chatPostSchema = z.object({
  message: z.string().min(1).max(8000),
});
export type ChatPost = z.infer<typeof chatPostSchema>;
