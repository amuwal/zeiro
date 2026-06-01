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
  fromName: z.string().nullable().optional(),
});
export type InquiryHeaders = z.infer<typeof inquiryHeadersSchema>;

export const incomingMessageSchema = z.object({
  messageId: z.string().min(1),
  receivedAt: z.string().datetime(),
  fromAddress: z.string().email(),
  fromName: z.string().nullable().optional(),
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
  'unmatched',
]);
export type InquiryStatus = z.infer<typeof inquiryStatusEnum>;

export const chatInquiryStatusEnum = inquiryStatusEnum.exclude(['unmatched']);
export type ChatInquiryStatus = z.infer<typeof chatInquiryStatusEnum>;

export const webFormSubmissionSchema = z.object({
  name: z.string().trim().min(1, '氏名を入力してください').max(200),
  email: z.string().trim().toLowerCase().email('有効なメールアドレスを入力してください').max(255),
  subject: z.string().trim().min(3, '件名は3文字以上で入力してください').max(300),
  body: z.string().trim().min(10, '本文は10文字以上で入力してください').max(10_000),
});
export type WebFormSubmission = z.infer<typeof webFormSubmissionSchema>;
