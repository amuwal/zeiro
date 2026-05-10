import { draftResultSchema } from '@zeiro/core';
import { z } from 'zod';

export const pipelineInputSchema = z.object({
  firmId: z.string().uuid(),
  clientNotes: z.string().nullable(),
  subject: z.string(),
  body: z.string(),
});
export type PipelineInput = z.infer<typeof pipelineInputSchema>;

export const pipelineOutputSchema = draftResultSchema;
export type PipelineOutput = z.infer<typeof pipelineOutputSchema>;
