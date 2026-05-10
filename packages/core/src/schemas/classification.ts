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

// AI review is the reflector's structured judgment after the drafter runs (or after
// we decide there's nothing to draft). It's the source of truth for what the UI
// shows the reviewer — replaces the keyword/regex heuristics that don't scale.
export const aiReviewSchema = z.object({
  // Drives UI mode: send-ready / yellow review banner / red escalation / "no reply".
  recommendation: z.enum(['send_as_is', 'review_required', 'human_handoff', 'no_reply_needed']),
  reasoning: z.string(),
  confidence: z.enum(['high', 'medium', 'low']),
  // Specific things the AI was uncertain about (shown as a checklist for reviewer).
  gaps: z.array(z.string()).default([]),
  // Concrete tips for the reviewer (capped at ~3 in the prompt).
  suggestions: z.array(z.string()).default([]),
});
export type AiReview = z.infer<typeof aiReviewSchema>;

export const draftResultSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('draft'),
    triage: triageResultSchema,
    subject: z.string(),
    body: z.string(),
    citations: z.array(citationSchema),
    confidence: z.number().min(0).max(1),
    aiReview: aiReviewSchema,
  }),
  z.object({
    kind: z.literal('no_draft'),
    triage: triageResultSchema,
    reason: z.string(),
    aiReview: aiReviewSchema,
  }),
  z.object({
    kind: z.literal('escalate'),
    triage: triageResultSchema,
    reason: z.string(),
    aiReview: aiReviewSchema,
  }),
]);
export type DraftResult = z.infer<typeof draftResultSchema>;
