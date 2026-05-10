'use server';

import {
  findAdminUserId,
  getDraftByInquiry,
  getFirm,
  getInquiry,
  recordAudit,
  recordDraftSent,
  setInquiryAssignee,
  setInquiryStatus,
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

export async function sendDraft(formData: FormData) {
  await sendCore(formData, { useEditedBody: false });
}

export async function sendEditedDraft(formData: FormData) {
  await sendCore(formData, { useEditedBody: true });
}

export async function assignToAdmin(formData: FormData) {
  const inquiryId = readId(formData);
  const { firmId, userId } = await requireFirmContext();
  const adminId = await findAdminUserId(firmId);
  if (!adminId) throw new Error('no admin in this firm');
  await setInquiryAssignee(firmId, inquiryId, adminId);
  await recordAudit({
    firmId,
    actorId: userId,
    inquiryId,
    action: 'inquiry.assigned',
    metadata: { assigneeId: adminId, reason: 'escalated_to_admin' },
  });
  revalidatePath('/inbox');
  redirect(`/inbox/${inquiryId}`);
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

async function sendCore(
  formData: FormData,
  opts: { useEditedBody: boolean },
): Promise<void> {
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

  const thread = buildOutboundThread({
    inquiryMessageId: inquiry.messageId,
    inquiryReferences: readInquiryReferences(inquiry.headers),
    draftId: draft.id,
    outboundDomain: env.OUTBOUND_FROM_DOMAIN,
  });

  const result = await sendReply({
    apiKey: env.SENDGRID_API_KEY,
    from: { name: firm.name, email: `reply@${env.OUTBOUND_FROM_DOMAIN}` },
    to: inquiry.client.primaryEmail,
    subject: ensureRePrefix(draft.subject || inquiry.subject),
    body: bodyToSend,
    messageId: thread.messageId,
    inReplyTo: thread.inReplyTo,
    references: thread.references,
    customArgs: { idempotencyKey: draft.id, firmId, inquiryId },
  });

  await recordDraftSent(draft.id, result);
  await setInquiryStatus(firmId, inquiryId, 'sent');
  await recordAudit({
    firmId,
    actorId: userId,
    inquiryId,
    action: 'draft.sent',
    metadata: {
      outboundMessageId: result.outboundMessageId,
      sgMessageId: result.sgMessageId,
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
  revalidatePath('/inbox');
  redirect('/inbox');
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
