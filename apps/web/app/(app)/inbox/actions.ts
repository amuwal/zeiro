'use server';

import type { ClientContractType } from '@zeiro/core';
import {
  createClient,
  findEscalationTarget,
  getInquiry,
  getMembership,
  listFirmUsers,
  promoteUnmatchedInquiry,
  recordAudit,
  setInquiryAssignee,
  setInquiryStatus,
} from '@zeiro/db';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireFirmContext } from '@/lib/firm-context';
import { inngest } from '@/lib/inngest/client';
import { processDraft } from '@/lib/process-draft';
import { sendDraftEmail } from '@/lib/send-draft';

/** 再生成 — re-run pipeline. */
export async function regenerateDraftAction(inquiryId: string): Promise<void> {
  const { firmId } = await requireFirmContext();
  await processDraft(firmId, inquiryId);
  revalidatePath(`/inbox/${inquiryId}`);
}

/** そのまま送信 — send the persisted draft as-is. */
export async function sendDraftAction(inquiryId: string): Promise<void> {
  const { firmId, userId } = await requireFirmContext();
  await sendDraftEmail({ firmId, userId, inquiryId, editedBody: null });
  revalidatePath(`/inbox/${inquiryId}`);
  revalidatePath('/inbox');
}

/** 編集して送信 — send the user-edited body (from the composer textarea). */
export async function sendEditedDraftAction(inquiryId: string, body: string): Promise<void> {
  const { firmId, userId } = await requireFirmContext();
  await sendDraftEmail({ firmId, userId, inquiryId, editedBody: body });
  revalidatePath(`/inbox/${inquiryId}`);
  revalidatePath('/inbox');
}

/** 却下 — mark the draft rejected; the inquiry goes back to a state where a
 * fresh draft can be generated. */
export async function rejectDraftAction(inquiryId: string): Promise<void> {
  const { firmId, userId } = await requireFirmContext();
  await setInquiryStatus(firmId, inquiryId, 'rejected');
  await recordAudit({
    firmId,
    actorId: userId,
    inquiryId,
    action: 'draft.rejected',
    metadata: { via: 'composer' },
  });
  revalidatePath(`/inbox/${inquiryId}`);
}

/** 所長に転送 — escalate the inquiry to the assignee's supervisor (or oldest
 * admin if no chain). */
export async function escalateInquiryAction(inquiryId: string): Promise<void> {
  const { firmId, userId } = await requireFirmContext();
  const inquiry = await getInquiry(firmId, inquiryId);
  if (!inquiry) throw new Error(`inquiry ${inquiryId} not found`);
  const fromUserId = inquiry.assignedToId ?? userId;
  const target = await findEscalationTarget(firmId, fromUserId);
  if (!target) throw new Error('no escalation target available in this firm');
  await setInquiryAssignee(firmId, inquiryId, target);
  await setInquiryStatus(firmId, inquiryId, 'escalated');
  await recordAudit({
    firmId,
    actorId: userId,
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
  return users.map((u) => ({ id: u.id, name: u.name, tier: u.tier }));
}

/** 担当変更 — reassign the inquiry. Permitted for admins (anyone → anyone)
 * and the current assignee (handing off). Pass null to unassign. */
export async function reassignInquiryAction(
  inquiryId: string,
  assigneeUserId: string | null,
): Promise<void> {
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

  if (assigneeUserId) {
    const targetMembership = await getMembership(assigneeUserId, firmId);
    if (!targetMembership) throw new Error('target user is not a member of this firm');
  }

  await setInquiryAssignee(firmId, inquiryId, assigneeUserId);
  await recordAudit({
    firmId,
    actorId: userId,
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
 * from the sender's email + the user-supplied display name. Re-queues the
 * inquiry through the pipeline so the agent can draft against the now-known
 * client. */
export async function promoteUnmatchedAction(
  inquiryId: string,
  name: string,
  contractType: ClientContractType,
): Promise<void> {
  const { firmId, userId } = await requireFirmContext();
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

/** 破棄 — mark an unmatched inquiry rejected (sender wasn't a real prospect:
 * spam, mis-addressed, etc.). */
export async function rejectUnmatchedAction(inquiryId: string): Promise<void> {
  const { firmId, userId } = await requireFirmContext();
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
