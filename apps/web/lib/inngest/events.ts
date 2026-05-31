import { z } from 'zod';

// requestId threads the inbound correlation id (minted at the webhook / server
// action boundary) through the async worker so a single user request is one
// searchable id end-to-end. Optional: a worker that receives an event without
// one mints a fresh id rather than dropping correlation.
const requestId = z.string().optional();

export const inquiryQueuedSchema = z.object({
  firmId: z.string().uuid(),
  inquiryId: z.string().uuid(),
  requestId,
});
export type InquiryQueued = z.infer<typeof inquiryQueuedSchema>;

export const knowledgeAutoAddSchema = z.object({
  firmId: z.string().uuid(),
  inquiryId: z.string().uuid(),
  draftId: z.string().uuid(),
  requestId,
});
export type KnowledgeAutoAdd = z.infer<typeof knowledgeAutoAddSchema>;

export const knowledgeUserUploadedSchema = z.object({
  jobId: z.string().uuid(),
  firmId: z.string().uuid(),
  actorId: z.string().uuid(),
  requestId,
});
export type KnowledgeUserUploaded = z.infer<typeof knowledgeUserUploadedSchema>;

export const clientImportUploadedSchema = z.object({
  importId: z.string().uuid(),
  firmId: z.string().uuid(),
  actorId: z.string().uuid(),
  requestId,
});
export type ClientImportUploaded = z.infer<typeof clientImportUploadedSchema>;

export type Events = {
  'inquiry.queued': { data: InquiryQueued };
  'knowledge.auto_add': { data: KnowledgeAutoAdd };
  'knowledge.user_uploaded': { data: KnowledgeUserUploaded };
  'clients.import_uploaded': { data: ClientImportUploaded };
};
