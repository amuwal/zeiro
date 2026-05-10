import {
  findDraftByOutboundMessageId,
  patchDraftMetadata,
  recordAudit,
  setInquiryStatus,
} from '@zeiro/db';
import { z } from 'zod';

const tagSchema = z.array(z.object({ name: z.string(), value: z.string() }));

const headerSchema = z.array(z.object({ name: z.string(), value: z.string() }));

const dataSchema = z.object({
  email_id: z.string(),
  created_at: z.string().optional(),
  to: z.array(z.string()).optional(),
  subject: z.string().optional(),
  reason: z.string().optional(),
  bounce: z
    .object({
      type: z.string().optional(),
      message: z.string().optional(),
    })
    .optional(),
  headers: headerSchema.optional(),
  tags: tagSchema.optional(),
});

const eventSchema = z.object({
  type: z.enum([
    'email.sent',
    'email.delivered',
    'email.delivery_delayed',
    'email.bounced',
    'email.complained',
    'email.opened',
    'email.clicked',
    'email.failed',
  ]),
  created_at: z.string().optional(),
  data: dataSchema,
});
type ResendEvent = z.infer<typeof eventSchema>;

const RELEVANT = new Set(['email.delivered', 'email.bounced', 'email.complained', 'email.failed']);

const SYSTEM_ACTOR = '00000000-0000-0000-0000-000000000000';

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

async function applyOne(event: ResendEvent): Promise<boolean> {
  if (!RELEVANT.has(event.type)) return false;

  const outboundMessageId = readMessageIdHeader(event.data.headers);
  if (!outboundMessageId) return false;

  const draft = await findDraftByOutboundMessageId(outboundMessageId);
  if (!draft) return false;

  const firmId = readTag(event.data.tags, 'firmId');
  const inquiryId = readTag(event.data.tags, 'inquiryId') ?? draft.inquiryId;
  if (!firmId) return false;

  switch (event.type) {
    case 'email.delivered':
      return handleDelivered(draft.id, event);
    case 'email.bounced':
    case 'email.failed':
      return handleFailure(firmId, draft.id, inquiryId, event, 'draft.bounced');
    case 'email.complained':
      return handleFailure(firmId, draft.id, inquiryId, event, 'draft.spam_reported');
    default:
      return false;
  }
}

function readMessageIdHeader(
  headers: { name: string; value: string }[] | undefined,
): string | null {
  if (!headers) return null;
  const h = headers.find((x) => x.name.toLowerCase() === 'message-id');
  if (!h) return null;
  return h.value.replace(/^<|>$/g, '').trim();
}

function readTag(tags: { name: string; value: string }[] | undefined, name: string): string | null {
  if (!tags) return null;
  return tags.find((t) => t.name === name)?.value ?? null;
}

async function handleDelivered(draftId: string, event: ResendEvent): Promise<boolean> {
  await patchDraftMetadata(draftId, {
    deliveredAt: event.created_at ?? new Date().toISOString(),
    providerEventId: event.data.email_id,
  });
  return true;
}

async function handleFailure(
  firmId: string,
  draftId: string,
  inquiryId: string,
  event: ResendEvent,
  action: 'draft.bounced' | 'draft.spam_reported',
): Promise<boolean> {
  const reason = event.data.bounce?.message ?? event.data.reason ?? event.type;
  const failure = {
    failedAt: event.created_at ?? new Date().toISOString(),
    failureType: event.type,
    failureReason: reason,
    providerEventId: event.data.email_id,
  };
  await patchDraftMetadata(draftId, failure);
  await setInquiryStatus(firmId, inquiryId, 'escalated');
  await recordAudit({
    firmId,
    actorId: SYSTEM_ACTOR,
    inquiryId,
    action,
    metadata: failure,
  });
  return true;
}
