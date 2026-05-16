'use server';

import {
  createDraft,
  findEscalationTarget,
  getDraftByInquiry,
  getFirm,
  getInquiry,
  getMembership,
  type InquiryWithClient,
  listFirmUsers,
  patchDraftMetadata,
  recordAudit,
  setInquiryAssignee,
  setInquiryStatus,
  type ThreadInquiry,
  walkThread,
} from '@zeiro/db';
import {
  buildOutboundThread,
  ensureRePrefix,
  readInquiryReferences,
  sendReply,
} from '@zeiro/email';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { env } from '@/lib/env';
import { requireFirmContext } from '@/lib/firm-context';
import { inngest } from '@/lib/inngest/client';
import { dispatchLine } from '@/lib/line/dispatch';

export async function sendDraft(formData: FormData) {
  await sendCore(formData, { useEditedBody: false });
}

export async function sendEditedDraft(formData: FormData) {
  await sendCore(formData, { useEditedBody: true });
}

// Escalate to the assignee's supervisor (or oldest admin if no chain).
// Replaces the previous "always pick oldest admin" behaviour now that the
// firm has a real supervisor tree.
export async function escalateInquiry(formData: FormData) {
  const inquiryId = readId(formData);
  const { firmId, userId } = await requireFirmContext();
  const inquiry = await getInquiry(firmId, inquiryId);
  if (!inquiry) throw new Error(`inquiry ${inquiryId} not found`);
  const fromUserId = inquiry.assignedToId ?? userId;
  const target = await findEscalationTarget(firmId, fromUserId);
  if (!target) throw new Error('no escalation target available in this firm');
  await setInquiryAssignee(firmId, inquiryId, target);
  await recordAudit({
    firmId,
    actorId: userId,
    inquiryId,
    action: 'inquiry.assigned',
    metadata: { assigneeId: target, fromUserId, reason: 'escalated_via_supervisor_chain' },
  });
  revalidatePath('/inbox');
  redirect(`/inbox/${inquiryId}`);
}

// Backwards-compat alias for callers that still import the old name. The
// new escalate-banner / detail-header forms reference `escalateInquiry`.
export const assignToAdmin = escalateInquiry;

// Manual reassignment from the inquiry detail header. Permitted for:
//   • admins (anyone → anyone),
//   • the current assignee (handing off to a teammate).
// Pure unassign (assigneeUserId = '') is also allowed under the same rules.
export async function reassignInquiry(formData: FormData) {
  const inquiryId = readId(formData);
  const targetRaw = formData.get('assigneeUserId');
  const target = typeof targetRaw === 'string' && targetRaw.length > 0 ? targetRaw : null;
  const { firmId, userId } = await requireFirmContext();

  const [inquiry, actor] = await Promise.all([
    getInquiry(firmId, inquiryId),
    getMembership(userId, firmId),
  ]);
  if (!inquiry) throw new Error(`inquiry ${inquiryId} not found`);
  if (!actor) throw new Error('actor membership missing');

  const isAdmin = actor.tier === 'admin' || actor.role.toLowerCase().includes('admin');
  const isCurrentAssignee = inquiry.assignedToId === userId;
  if (!isAdmin && !isCurrentAssignee) {
    throw new Error('not authorized to reassign this inquiry');
  }

  // Reassigning to someone outside the firm would be a real bug — guard
  // with an explicit membership check.
  if (target) {
    const targetMembership = await getMembership(target, firmId);
    if (!targetMembership) throw new Error('target user is not a member of this firm');
  }

  await setInquiryAssignee(firmId, inquiryId, target);
  await recordAudit({
    firmId,
    actorId: userId,
    inquiryId,
    action: 'inquiry.assigned',
    metadata: {
      assigneeId: target,
      previousAssigneeId: inquiry.assignedToId,
      reason: target === null ? 'manual_unassign' : 'manual_reassign',
    },
  });
  revalidatePath('/inbox');
  revalidatePath(`/inbox/${inquiryId}`);
}

// Used by the reassign dropdown to enumerate team members.
export async function listFirmAssignees() {
  const { firmId } = await requireFirmContext();
  const users = await listFirmUsers(firmId);
  return users.map((u) => ({ id: u.id, name: u.name, tier: u.tier }));
}

export async function rejectDraft(formData: FormData) {
  const inquiryId = readId(formData);
  const { firmId, userId } = await requireFirmContext();
  await setInquiryStatus(firmId, inquiryId, 'rejected');
  await recordAudit({
    firmId,
    actorId: userId,
    inquiryId,
    action: 'draft.rejected',
    metadata: { via: 'review-ui' },
  });
  revalidatePath('/inbox');
  redirect('/inbox');
}

export async function retryDraft(formData: FormData) {
  const inquiryId = readId(formData);
  const { firmId, userId } = await requireFirmContext();
  await setInquiryStatus(firmId, inquiryId, 'pending');
  await inngest.send({
    name: 'inquiry.queued',
    data: { firmId, inquiryId },
    id: `inquiry-retry-${inquiryId}-${Date.now()}`,
  });
  await recordAudit({
    firmId,
    actorId: userId,
    inquiryId,
    action: 'inquiry.assigned',
    metadata: { reason: 'manual_retry_after_failure' },
  });
  revalidatePath(`/inbox/${inquiryId}`);
  redirect(`/inbox/${inquiryId}`);
}

type DispatchResult = {
  outboundMessageId: string;
  providerMetadata: Record<string, unknown>;
};

async function sendCore(formData: FormData, opts: { useEditedBody: boolean }): Promise<void> {
  const inquiryId = readId(formData);
  const { firmId, userId } = await requireFirmContext();

  const [inquiry, draft, firm] = await Promise.all([
    getInquiry(firmId, inquiryId),
    getDraftByInquiry(inquiryId),
    getFirm(firmId),
  ]);
  if (!inquiry) throw new Error(`inquiry ${inquiryId} not found`);
  if (!draft) throw new Error(`no draft for inquiry ${inquiryId}`);

  const editedBody = opts.useEditedBody ? readBody(formData) : null;
  const bodyToSend = editedBody ?? draft.body;
  const wasEdited = editedBody !== null && editedBody !== draft.body;

  const dispatch =
    inquiry.channel === 'line'
      ? await dispatchLineReply(firmId, inquiry, draft.id, bodyToSend)
      : await dispatchEmailReply(inquiry, draft, firm, bodyToSend, firmId, inquiryId);

  await patchDraftMetadata(draft.id, {
    sentAt: new Date().toISOString(),
    channel: inquiry.channel,
    outboundMessageId: dispatch.outboundMessageId,
    ...dispatch.providerMetadata,
  });
  await setInquiryStatus(firmId, inquiryId, 'sent');
  await recordAudit({
    firmId,
    actorId: userId,
    inquiryId,
    action: 'draft.sent',
    metadata: {
      channel: inquiry.channel,
      outboundMessageId: dispatch.outboundMessageId,
      ...dispatch.providerMetadata,
      edited: wasEdited,
      ...(wasEdited && editedBody !== null
        ? {
            sentBody: editedBody,
            originalLength: draft.body.length,
            sentLength: editedBody.length,
          }
        : {}),
    },
  });

  await inngest.send({
    name: 'knowledge.auto_add',
    data: { firmId, inquiryId, draftId: draft.id },
    id: `auto-add-${draft.id}`,
  });

  revalidatePath('/inbox');
  redirect('/inbox');
}

async function dispatchEmailReply(
  inquiry: InquiryWithClient,
  draft: { id: string; subject: string; body: string },
  firm: { name: string; inboundAddress: string },
  bodyToSend: string,
  firmId: string,
  inquiryId: string,
): Promise<DispatchResult> {
  if (!env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY not configured — cannot send outbound email');
  }
  if (!inquiry.client) {
    throw new Error('cannot send reply: inquiry has no associated client (unmatched sender)');
  }
  const fromAddress = firm.inboundAddress;
  const fromDomain = fromAddress.split('@')[1] ?? env.OUTBOUND_FROM_DOMAIN;
  const thread = buildOutboundThread({
    inquiryMessageId: inquiry.messageId,
    inquiryReferences: readInquiryReferences(inquiry.headers),
    draftId: draft.id,
    outboundDomain: fromDomain,
  });
  const result = await sendReply({
    apiKey: env.RESEND_API_KEY,
    from: { name: firm.name, email: fromAddress },
    replyTo: { name: firm.name, email: fromAddress },
    to: inquiry.client.primaryEmail,
    subject: ensureRePrefix(draft.subject || inquiry.subject),
    body: bodyToSend,
    messageId: thread.messageId,
    inReplyTo: thread.inReplyTo,
    references: thread.references,
    tags: { idempotencyKey: draft.id, firmId, inquiryId },
  });
  return {
    outboundMessageId: result.outboundMessageId,
    providerMetadata: { providerMessageId: result.providerMessageId },
  };
}

async function dispatchLineReply(
  firmId: string,
  inquiry: InquiryWithClient,
  draftId: string,
  bodyToSend: string,
): Promise<DispatchResult> {
  if (!inquiry.client) {
    throw new Error('cannot send LINE reply: inquiry has no associated client');
  }
  const lineUserId = inquiry.client.lineUserId;
  if (!lineUserId) throw new Error('client has no LINE userId');
  return dispatchLine({ firmId, draftId, lineUserId, body: bodyToSend });
}

export async function sendFollowUp(formData: FormData) {
  const inquiryId = readId(formData);
  const body = readBody(formData).trim();
  if (body.length === 0) throw new Error('follow-up body cannot be empty');
  const { firmId, userId } = await requireFirmContext();

  const [inquiry, firm, thread] = await Promise.all([
    getInquiry(firmId, inquiryId),
    getFirm(firmId),
    walkThread(firmId, inquiryId),
  ]);
  if (!inquiry) throw new Error(`inquiry ${inquiryId} not found`);
  if (!inquiry.client) throw new Error('cannot follow up on unmatched inquiry');
  if (!env.RESEND_API_KEY) throw new Error('RESEND_API_KEY not configured');

  const chain = collectMessageIds(thread);
  if (chain.length === 0) throw new Error('no prior thread messages to follow up on');
  const inReplyTo = chain[chain.length - 1] ?? inquiry.messageId;
  const references = chain.slice(0, -1);

  const subject = ensureRePrefix(inquiry.subject);
  const draft = await createDraft({
    inquiryId,
    subject,
    body,
    citations: [],
    confidence: 1,
    model: 'manual',
  });

  const fromAddress = firm.inboundAddress;
  const fromDomain = fromAddress.split('@')[1] ?? env.OUTBOUND_FROM_DOMAIN;
  const result = await sendReply({
    apiKey: env.RESEND_API_KEY,
    from: { name: firm.name, email: fromAddress },
    replyTo: { name: firm.name, email: fromAddress },
    to: inquiry.client.primaryEmail,
    subject,
    body,
    messageId: `${draft.id}@${fromDomain}`,
    inReplyTo,
    references,
    tags: { idempotencyKey: draft.id, firmId, inquiryId },
  });

  const sentAt = new Date().toISOString();
  // Distinguish a true follow-up (firm replied previously, sending another) from
  // a manual first reply (status was escalated, AI didn't draft, reviewer wrote
  // the reply themselves). Both go through the same code path; metadata.kind
  // tags them so the conversation timeline can label appropriately.
  const wasEscalated = inquiry.status === 'escalated';
  const kind = wasEscalated ? 'manual' : 'follow_up';
  await patchDraftMetadata(draft.id, {
    sentAt,
    channel: 'email',
    outboundMessageId: result.outboundMessageId,
    providerMessageId: result.providerMessageId,
    kind,
  });

  // Always flip to 'sent' — covers both "reply after our prior reply" (was already
  // 'sent', no-op) and "first manual reply after AI escalation" (was 'escalated').
  await setInquiryStatus(firmId, inquiryId, 'sent');

  await recordAudit({
    firmId,
    actorId: userId,
    inquiryId,
    action: 'draft.sent',
    metadata: {
      channel: 'email',
      outboundMessageId: result.outboundMessageId,
      kind,
      sentBody: body,
      sentAt,
      ...(wasEscalated ? { previousStatus: 'escalated' } : {}),
    },
  });

  revalidatePath('/inbox');
  revalidatePath(`/inbox/${inquiryId}`);
  redirect(`/inbox/${inquiryId}`);
}

function collectMessageIds(thread: ThreadInquiry[]): string[] {
  const events: { at: number; id: string }[] = [];
  for (const inq of thread) {
    events.push({ at: inq.receivedAt.getTime(), id: inq.messageId });
    for (const d of inq.drafts) {
      const meta = d.metadata;
      if (!meta || typeof meta !== 'object' || Array.isArray(meta)) continue;
      const m = meta as { sentAt?: unknown; outboundMessageId?: unknown };
      if (typeof m.sentAt !== 'string' || typeof m.outboundMessageId !== 'string') continue;
      events.push({ at: new Date(m.sentAt).getTime(), id: m.outboundMessageId });
    }
  }
  events.sort((a, b) => a.at - b.at);
  return events.map((e) => e.id).filter((id) => id.length > 0);
}

function readId(formData: FormData): string {
  const id = formData.get('inquiryId');
  if (typeof id !== 'string') throw new Error('missing inquiryId');
  return id;
}

function readBody(formData: FormData): string {
  const body = formData.get('body');
  if (typeof body !== 'string') throw new Error('missing body');
  return body;
}
