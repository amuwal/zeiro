'use server';

import {
  findAdminUserId,
  getDraftByInquiry,
  getFirm,
  getInquiry,
  type InquiryWithClient,
  patchDraftMetadata,
  recordAudit,
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
import { inngest } from '@/lib/inngest/client';
import { dispatchLine } from '@/lib/line/dispatch';

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
      : await dispatchEmailReply(inquiry, draft, firm.name, bodyToSend, firmId, inquiryId);

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
  firmName: string,
  bodyToSend: string,
  firmId: string,
  inquiryId: string,
): Promise<DispatchResult> {
  const thread = buildOutboundThread({
    inquiryMessageId: inquiry.messageId,
    inquiryReferences: readInquiryReferences(inquiry.headers),
    draftId: draft.id,
    outboundDomain: env.OUTBOUND_FROM_DOMAIN,
  });
  const result = await sendReply({
    apiKey: env.SENDGRID_API_KEY,
    from: { name: firmName, email: `reply@${env.OUTBOUND_FROM_DOMAIN}` },
    to: inquiry.client.primaryEmail,
    subject: ensureRePrefix(draft.subject || inquiry.subject),
    body: bodyToSend,
    messageId: thread.messageId,
    inReplyTo: thread.inReplyTo,
    references: thread.references,
    customArgs: { idempotencyKey: draft.id, firmId, inquiryId },
  });
  return {
    outboundMessageId: result.outboundMessageId,
    providerMetadata: { sgMessageId: result.sgMessageId },
  };
}

async function dispatchLineReply(
  firmId: string,
  inquiry: InquiryWithClient,
  draftId: string,
  bodyToSend: string,
): Promise<DispatchResult> {
  const lineUserId = inquiry.client.lineUserId;
  if (!lineUserId) throw new Error('client has no LINE userId');
  return dispatchLine({ firmId, draftId, lineUserId, body: bodyToSend });
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
