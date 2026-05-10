import { z } from 'zod';

export const auditActionEnum = z.enum([
  'inquiry.received',
  'inquiry.assigned',
  'draft.generated',
  'draft.sent',
  'draft.delivered',
  'draft.bounced',
  'draft.spam_reported',
  'draft.rejected',
  'draft.escalated',
  'knowledge.updated',
  'client.tombstoned',
  'client.identity_linked',
  'channel.configured',
]);
export type AuditAction = z.infer<typeof auditActionEnum>;

export const auditEventSchema = z.object({
  id: z.string().uuid(),
  firmId: z.string().uuid(),
  actorId: z.string().uuid(),
  inquiryId: z.string().uuid().nullable(),
  action: auditActionEnum,
  metadata: z.record(z.string(), z.unknown()),
  createdAt: z.string().datetime(),
});
export type AuditEvent = z.infer<typeof auditEventSchema>;
