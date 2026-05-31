'use server';

import type { ClientContractType } from '@zeiro/core';
import {
  createClient,
  findEscalationTarget,
  getInquiry,
  getMembership,
  listFirmUsers,
  markInquiryRead,
  promoteUnmatchedInquiry,
  recordAudit,
  setInquiryAssignee,
  setInquiryStatus,
} from '@zeiro/db';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { ctxCan, requireCan, viewerScope } from '@/lib/authz';
import type { FirmContext } from '@/lib/firm-context';
import { requireFirmContext } from '@/lib/firm-context';
import { inngest } from '@/lib/inngest/client';
import { sendDraft } from '@/lib/send-draft';

// Object-level scope check: an assigned-scope user must not act on an inquiry
// they can't see, even if they call the action directly with a guessed id.
async function requireVisibleInquiry(ctx: FirmContext, inquiryId: string) {
  const inquiry = await getInquiry(ctx.firmId, inquiryId, viewerScope(ctx));
  if (!inquiry) throw new Error(`inquiry ${inquiryId} not found or not accessible`);
  return inquiry;
}

/** Mark an inquiry as seen by the current user (read/unread tracking). Fired
 * when the detail view opens; no-op if the user can't see the inquiry. */
export async function markInquiryReadAction(inquiryId: string): Promise<void> {
  const ctx = await requireFirmContext();
  const inquiry = await getInquiry(ctx.firmId, inquiryId, viewerScope(ctx));
  if (!inquiry) return;
  await markInquiryRead(ctx.firmId, ctx.userId, inquiryId);
  revalidatePath('/inbox', 'layout');
  revalidatePath('/home');
}

/** 再生成 — re-run the pipeline off the request thread via Inngest (same path
 * as inbound + promote). Running it inline blocked on the up-to-90s agent loop
 * and surfaced any failure as an opaque Server Action error; enqueuing lets the
 * composer poll while status is `pending` and routes failures through
 * draftInquiryFn.onFailure. */
export async function regenerateDraftAction(inquiryId: string): Promise<void> {
  const ctx = await requireCan('inquiry.draft');
  await requireVisibleInquiry(ctx, inquiryId);
  await setInquiryStatus(ctx.firmId, inquiryId, 'pending');
  await inngest.send({
    name: 'inquiry.queued',
    data: { firmId: ctx.firmId, inquiryId },
    id: `inquiry-regen-${inquiryId}-${Date.now()}`,
  });
  revalidatePath(`/inbox/${inquiryId}`);
}

/** そのまま送信 — send the persisted draft as-is. */
export async function sendDraftAction(inquiryId: string): Promise<void> {
  const ctx = await requireCan('inquiry.send');
  await requireVisibleInquiry(ctx, inquiryId);
  await sendDraft({ firmId: ctx.firmId, userId: ctx.userId, inquiryId, editedBody: null });
  revalidatePath(`/inbox/${inquiryId}`);
  revalidatePath('/inbox');
}

/** 編集して送信 — send the user-edited body (from the composer textarea). */
export async function sendEditedDraftAction(inquiryId: string, body: string): Promise<void> {
  const ctx = await requireCan('inquiry.send');
  await requireVisibleInquiry(ctx, inquiryId);
  await sendDraft({ firmId: ctx.firmId, userId: ctx.userId, inquiryId, editedBody: body });
  revalidatePath(`/inbox/${inquiryId}`);
  revalidatePath('/inbox');
}

/** 却下 — mark the draft rejected; the inquiry goes back to a state where a
 * fresh draft can be generated. A reason is captured for the audit trail. */
export async function rejectDraftAction(inquiryId: string, reason?: string): Promise<void> {
  const ctx = await requireCan('inquiry.reject');
  await requireVisibleInquiry(ctx, inquiryId);
  await setInquiryStatus(ctx.firmId, inquiryId, 'rejected');
  await recordAudit({
    firmId: ctx.firmId,
    actorId: ctx.userId,
    inquiryId,
    action: 'draft.rejected',
    metadata: { via: 'composer', ...(reason?.trim() ? { reason: reason.trim() } : {}) },
  });
  revalidatePath(`/inbox/${inquiryId}`);
}

/** 所長に転送 — escalate the inquiry to the assignee's supervisor (or oldest
 * admin if no chain). */
export async function escalateInquiryAction(inquiryId: string): Promise<void> {
  const ctx = await requireCan('inquiry.draft');
  const inquiry = await requireVisibleInquiry(ctx, inquiryId);
  const fromUserId = inquiry.assignedToId ?? ctx.userId;
  const target = await findEscalationTarget(ctx.firmId, fromUserId);
  if (!target) throw new Error('no escalation target available in this firm');
  await setInquiryAssignee(ctx.firmId, inquiryId, target);
  await setInquiryStatus(ctx.firmId, inquiryId, 'escalated');
  await recordAudit({
    firmId: ctx.firmId,
    actorId: ctx.userId,
    inquiryId,
    action: 'inquiry.assigned',
    metadata: { assigneeId: target, fromUserId, reason: 'escalated_via_composer' },
  });
  revalidatePath(`/inbox/${inquiryId}`);
}

/** 担当者一覧 — enumerate firm members for the assignment dropdown. */
export async function listFirmAssigneesAction() {
  const { firmId } = await requireFirmContext();
  const users = await listFirmUsers(firmId);
  return users.map((u) => ({ id: u.id, name: u.name, appRole: u.appRole }));
}

/** 担当変更 — reassign the inquiry. Permitted for owner/reviewer (anyone →
 * anyone) and the current assignee handing off. Pass null to unassign. */
export async function reassignInquiryAction(
  inquiryId: string,
  assigneeUserId: string | null,
): Promise<void> {
  const ctx = await requireFirmContext();
  const inquiry = await requireVisibleInquiry(ctx, inquiryId);

  const canReassignAny = ctxCan(ctx, 'inquiry.reassign');
  const isCurrentAssignee = inquiry.assignedToId === ctx.userId;
  if (!canReassignAny && !isCurrentAssignee) {
    throw new Error('not authorized to reassign this inquiry');
  }

  if (assigneeUserId) {
    const targetMembership = await getMembership(assigneeUserId, ctx.firmId);
    if (!targetMembership) throw new Error('target user is not a member of this firm');
  }

  await setInquiryAssignee(ctx.firmId, inquiryId, assigneeUserId);
  await recordAudit({
    firmId: ctx.firmId,
    actorId: ctx.userId,
    inquiryId,
    action: 'inquiry.assigned',
    metadata: {
      assigneeId: assigneeUserId,
      previousAssigneeId: inquiry.assignedToId,
      reason: assigneeUserId === null ? 'manual_unassign' : 'manual_reassign',
    },
  });
  revalidatePath('/inbox');
  revalidatePath(`/inbox/${inquiryId}`);
}

/** 顧問先として登録 — promote an unmatched inquiry by creating a new client
 * from the sender's email. Triage of unmatched senders is an owner/reviewer
 * task (client.manage). Re-queues the inquiry through the pipeline. */
export async function promoteUnmatchedAction(
  inquiryId: string,
  name: string,
  contractType: ClientContractType,
): Promise<void> {
  const { firmId, userId } = await requireCan('client.manage');
  const inquiry = await getInquiry(firmId, inquiryId);
  if (!inquiry) throw new Error(`inquiry ${inquiryId} not found`);
  if (!inquiry.unmatchedSender) {
    throw new Error('inquiry has no unmatched sender — already matched to a client');
  }
  const trimmed = name.trim();
  if (trimmed.length === 0) throw new Error('client name required');

  const created = await createClient(firmId, {
    name: trimmed,
    primaryEmail: inquiry.unmatchedSender,
    contractType,
    source: 'email_promotion',
    createdBy: userId,
  });
  if (!created.ok) {
    throw new Error(`client with email ${inquiry.unmatchedSender} already exists`);
  }
  await promoteUnmatchedInquiry(firmId, inquiryId, created.id, inquiry.assignedToId ?? null);
  await recordAudit({
    firmId,
    actorId: userId,
    inquiryId,
    action: 'client.promoted_from_email',
    metadata: {
      clientId: created.id,
      fromAddress: inquiry.unmatchedSender,
      name: trimmed,
      contractType,
    },
  });
  await inngest.send({
    name: 'inquiry.queued',
    data: { firmId, inquiryId },
    id: `inquiry-promote-${inquiryId}`,
  });
  revalidatePath('/inbox');
  revalidatePath(`/inbox/${inquiryId}`);
}

/** 破棄 — mark an unmatched inquiry rejected (spam / mis-addressed). */
export async function rejectUnmatchedAction(inquiryId: string): Promise<void> {
  const { firmId, userId } = await requireCan('client.manage');
  const inquiry = await getInquiry(firmId, inquiryId);
  if (!inquiry) throw new Error(`inquiry ${inquiryId} not found`);
  await setInquiryStatus(firmId, inquiryId, 'rejected');
  await recordAudit({
    firmId,
    actorId: userId,
    inquiryId,
    action: 'inquiry.discarded',
    metadata: {
      fromAddress: inquiry.unmatchedSender,
      subject: inquiry.subject,
      reason: 'unmatched_sender_rejected',
    },
  });
  revalidatePath('/inbox');
  redirect('/inbox');
}
