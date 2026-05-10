import { z } from 'zod';

export const auditActionEnum = z.enum([
  'inquiry.received',
  'inquiry.assigned',
  'inquiry.discarded',
  'draft.generated',
  'draft.sent',
  'draft.delivered',
  'draft.bounced',
  'draft.spam_reported',
  'draft.rejected',
  'draft.escalated',
  'draft.failed',
  'knowledge.updated',
  'client.created',
  'client.updated',
  'client.archived',
  'client.unarchived',
  'client.deleted',
  'client.tombstoned',
  'client.identity_linked',
  'client.promoted_from_email',
  'channel.configured',
  'member.invited',
  'member.role_changed',
  'member.removed',
  'invitation.revoked',
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
