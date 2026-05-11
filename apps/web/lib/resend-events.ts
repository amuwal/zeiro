import { patchDraftMetadata, recordAudit, setInquiryStatus } from '@zeiro/db';
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

// email.sent fires first (when Resend hands off to SES) and carries the
// SES-assigned Message-ID in headers. Capturing it there lets us thread customer
// replies that reference SES's Message-ID instead of our custom one.
const RELEVANT = new Set([
  'email.sent',
  'email.delivered',
  'email.bounced',
  'email.complained',
  'email.failed',
]);

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

  // Look up draft via tags — we set `idempotencyKey = draft.id` at send time,
  // which is more reliable than matching by Message-ID (SES rewrites ours).
  const firmId = readTag(event.data.tags, 'firmId');
  const draftId = readTag(event.data.tags, 'idempotencyKey');
  const inquiryId = readTag(event.data.tags, 'inquiryId');
  if (!firmId || !draftId || !inquiryId) return false;

  // The Message-ID in event.data.headers is the SES-assigned one — capture it on
  // the draft so future customer replies (whose In-Reply-To references this ID)
  // can be threaded back. We do this on every relevant event so even if
  // email.sent is missed we'll catch it on email.delivered.
  const sentMessageId = readMessageIdHeader(event.data.headers);
  if (sentMessageId) {
    await patchDraftMetadata(draftId, { sentMessageId });
  }

  switch (event.type) {
    case 'email.sent':
      return handleSent(draftId, event);
    case 'email.delivered':
      return handleDelivered(draftId, event);
    case 'email.bounced':
    case 'email.failed':
      return handleFailure(firmId, draftId, inquiryId, event, 'draft.bounced');
    case 'email.complained':
      return handleFailure(firmId, draftId, inquiryId, event, 'draft.spam_reported');
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

async function handleSent(draftId: string, event: ResendEvent): Promise<boolean> {
  await patchDraftMetadata(draftId, {
    sentAcknowledgedAt: event.created_at ?? new Date().toISOString(),
    providerEventId: event.data.email_id,
  });
  return true;
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
