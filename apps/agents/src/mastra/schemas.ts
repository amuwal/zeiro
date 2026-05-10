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
  clientNotes: z.string().nullable(),
  subject: z.string(),
  body: z.string(),
  threadHistory: z.array(threadMessageSchema).optional(),
});
export type PipelineInput = z.infer<typeof pipelineInputSchema>;

export const pipelineOutputSchema = draftResultSchema;
export type PipelineOutput = z.infer<typeof pipelineOutputSchema>;
