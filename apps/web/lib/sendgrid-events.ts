import { EventWebhook, EventWebhookHeader } from '@sendgrid/eventwebhook';
import {
  findDraftBySgMessageId,
  patchDraftMetadata,
  recordAudit,
  setInquiryStatus,
} from '@zeiro/db';
import { z } from 'zod';

const eventSchema = z.object({
  email: z.string().email().optional(),
  timestamp: z.number(),
  sg_event_id: z.string(),
  sg_message_id: z.string(),
  event: z.enum([
    'delivered',
    'bounce',
    'dropped',
    'spamreport',
    'blocked',
    'deferred',
    'processed',
    'open',
    'click',
  ]),
  type: z.string().optional(),
  reason: z.string().optional(),
  status: z.string().optional(),
  firmId: z.string().uuid().optional(),
  inquiryId: z.string().uuid().optional(),
  idempotencyKey: z.string().optional(),
});
type SendGridEvent = z.infer<typeof eventSchema>;

export function verifySignature(
  rawBody: string,
  signature: string,
  timestamp: string,
  publicKey: string,
): boolean {
  const ew = new EventWebhook();
  const ec = ew.convertPublicKeyToECDSA(publicKey);
  return ew.verifySignature(ec, rawBody, signature, timestamp);
}

export function readSignatureHeaders(
  headers: Headers,
): { signature: string; timestamp: string } | null {
  const signature = headers.get(EventWebhookHeader.SIGNATURE().toLowerCase());
  const timestamp = headers.get(EventWebhookHeader.TIMESTAMP().toLowerCase());
  if (!signature || !timestamp) return null;
  return { signature, timestamp };
}

export async function applyEvents(
  rawEvents: unknown[],
): Promise<{ applied: number; ignored: number }> {
  let applied = 0;
  let ignored = 0;
  for (const raw of rawEvents) {
    const parsed = eventSchema.safeParse(raw);
    if (!parsed.success) {
      ignored += 1;
      continue;
    }
    const handled = await applyOne(parsed.data);
    if (handled) applied += 1;
    else ignored += 1;
  }
  return { applied, ignored };
}

async function applyOne(event: SendGridEvent): Promise<boolean> {
  if (!RELEVANT.has(event.event)) return false;
  const draft = await findDraftBySgMessageId(event.sg_message_id);
  if (!draft) return false;
  const ctx = await resolveContext(event, draft);
  if (!ctx) return false;

  switch (event.event) {
    case 'delivered':
      return handleDelivered(ctx, draft, event);
    case 'bounce':
    case 'dropped':
      return handleFailure(ctx, draft, event, 'draft.bounced');
    case 'spamreport':
      return handleFailure(ctx, draft, event, 'draft.spam_reported');
    default:
      return false;
  }
}

const RELEVANT = new Set(['delivered', 'bounce', 'dropped', 'spamreport']);
const SYSTEM_ACTOR = '00000000-0000-0000-0000-000000000000';

type Ctx = { firmId: string; inquiryId: string };

async function resolveContext(
  event: SendGridEvent,
  _draft: { inquiryId: string },
): Promise<Ctx | null> {
  if (event.firmId && event.inquiryId) {
    return { firmId: event.firmId, inquiryId: event.inquiryId };
  }
  return null;
}

async function handleDelivered(
  ctx: Ctx,
  draft: { id: string; deliveredAt: string | null },
  event: SendGridEvent,
): Promise<boolean> {
  if (draft.deliveredAt) return false;
  await patchDraftMetadata(draft.id, {
    deliveredAt: new Date(event.timestamp * 1000).toISOString(),
  });
  await recordAudit({
    firmId: ctx.firmId,
    actorId: SYSTEM_ACTOR,
    inquiryId: ctx.inquiryId,
    action: 'draft.delivered',
    metadata: { sgEventId: event.sg_event_id, sgMessageId: event.sg_message_id },
  });
  return true;
}

async function handleFailure(
  ctx: Ctx,
  draft: { id: string },
  event: SendGridEvent,
  action: 'draft.bounced' | 'draft.spam_reported',
): Promise<boolean> {
  await patchDraftMetadata(draft.id, {
    failedAt: new Date(event.timestamp * 1000).toISOString(),
    failureType: event.event,
    failureReason: event.reason ?? null,
  });
  await setInquiryStatus(ctx.firmId, ctx.inquiryId, 'escalated');
  await recordAudit({
    firmId: ctx.firmId,
    actorId: SYSTEM_ACTOR,
    inquiryId: ctx.inquiryId,
    action,
    metadata: {
      sgEventId: event.sg_event_id,
      sgMessageId: event.sg_message_id,
      reason: event.reason,
      type: event.type,
    },
  });
  return true;
}
