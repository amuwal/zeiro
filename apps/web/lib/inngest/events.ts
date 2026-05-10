import { z } from 'zod';

export const inquiryQueuedSchema = z.object({
  firmId: z.string().uuid(),
  inquiryId: z.string().uuid(),
});
export type InquiryQueued = z.infer<typeof inquiryQueuedSchema>;

export const knowledgeAutoAddSchema = z.object({
  firmId: z.string().uuid(),
  inquiryId: z.string().uuid(),
  draftId: z.string().uuid(),
});
export type KnowledgeAutoAdd = z.infer<typeof knowledgeAutoAddSchema>;

export type Events = {
  'inquiry.queued': { data: InquiryQueued };
  'knowledge.auto_add': { data: KnowledgeAutoAdd };
};
