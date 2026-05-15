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

export const knowledgeUserUploadedSchema = z.object({
  jobId: z.string().uuid(),
  firmId: z.string().uuid(),
  actorId: z.string().uuid(),
});
export type KnowledgeUserUploaded = z.infer<typeof knowledgeUserUploadedSchema>;

export const clientImportUploadedSchema = z.object({
  importId: z.string().uuid(),
  firmId: z.string().uuid(),
  actorId: z.string().uuid(),
});
export type ClientImportUploaded = z.infer<typeof clientImportUploadedSchema>;

export type Events = {
  'inquiry.queued': { data: InquiryQueued };
  'knowledge.auto_add': { data: KnowledgeAutoAdd };
  'knowledge.user_uploaded': { data: KnowledgeUserUploaded };
  'clients.import_uploaded': { data: ClientImportUploaded };
};
