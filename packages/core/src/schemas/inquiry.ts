import { z } from 'zod';

export const attachmentSchema = z.object({
  filename: z.string(),
  contentType: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  contentBase64: z.string(),
});
export type Attachment = z.infer<typeof attachmentSchema>;

export const inquiryHeadersSchema = z.object({
  inReplyTo: z.string().nullable(),
  references: z.array(z.string()),
});
export type InquiryHeaders = z.infer<typeof inquiryHeadersSchema>;

export const incomingMessageSchema = z.object({
  messageId: z.string().min(1),
  receivedAt: z.string().datetime(),
  fromAddress: z.string().email(),
  toAddress: z.string().email(),
  subject: z.string(),
  body: z.string(),
  attachments: z.array(attachmentSchema),
  headers: inquiryHeadersSchema.optional(),
});
export type IncomingMessage = z.infer<typeof incomingMessageSchema>;

export const inquiryStatusEnum = z.enum([
  'pending',
  'drafted',
  'sent',
  'rejected',
  'escalated',
]);
export type InquiryStatus = z.infer<typeof inquiryStatusEnum>;
