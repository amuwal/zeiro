import { z } from 'zod';
import { categoryEnum } from '../constants/categories';

export const urgencyEnum = z.enum(['high', 'medium', 'low']);
export type Urgency = z.infer<typeof urgencyEnum>;

export const triageResultSchema = z.object({
  category: categoryEnum,
  confidence: z.number().min(0).max(1),
  urgency: urgencyEnum,
  requiresTaxJudgment: z.boolean(),
});
export type TriageResult = z.infer<typeof triageResultSchema>;

export const citationSchema = z.object({
  source: z.string(),
  snippet: z.string(),
});
export type Citation = z.infer<typeof citationSchema>;

export const draftResultSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('draft'),
    subject: z.string(),
    body: z.string(),
    citations: z.array(citationSchema),
    confidence: z.number().min(0).max(1),
  }),
  z.object({
    kind: z.literal('no_draft'),
    reason: z.string(),
  }),
  z.object({
    kind: z.literal('escalate'),
    reason: z.string(),
    triage: triageResultSchema,
  }),
]);
export type DraftResult = z.infer<typeof draftResultSchema>;
