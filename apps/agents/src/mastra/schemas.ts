import { draftResultSchema } from '@zeiro/core';
import { z } from 'zod';

export const threadMessageSchema = z.object({
  role: z.enum(['customer', 'firm']),
  at: z.string(),
  body: z.string(),
});
export type ThreadMessage = z.infer<typeof threadMessageSchema>;

export const pipelineInputSchema = z.object({
  firmId: z.string().uuid(),
  // Agent uses inquiryId as the Mastra thread key so the agent thread can be
  // resumed for the chat surface in slice 3. Optional for eval/dev callers.
  inquiryId: z.string().uuid().optional(),
  // Agent uses clientId via requestContext for get-client / get-recent-inquiries.
  // null = unmatched sender (web contact form before client binding).
  clientId: z.string().uuid().nullable().optional(),
  clientNotes: z.string().nullable(),
  subject: z.string(),
  body: z.string(),
  threadHistory: z.array(threadMessageSchema).optional(),
});
export type PipelineInput = z.infer<typeof pipelineInputSchema>;

export const pipelineOutputSchema = draftResultSchema;
export type PipelineOutput = z.infer<typeof pipelineOutputSchema>;
