import { z } from 'zod';

export const inquiryQueuedSchema = z.object({
  firmId: z.string().uuid(),
  inquiryId: z.string().uuid(),
});
export type InquiryQueued = z.infer<typeof inquiryQueuedSchema>;

export type Events = {
  'inquiry.queued': { data: InquiryQueued };
};
