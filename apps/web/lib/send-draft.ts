import {
  getDraftByInquiry,
  getFirm,
  getInquiry,
  patchDraftMetadata,
  recordAudit,
  setInquiryStatus,
} from '@zeiro/db';
import {
  buildOutboundThread,
  ensureRePrefix,
  readInquiryReferences,
  sendReply,
} from '@zeiro/email';
import { env } from './env';
import { inngest } from './inngest/client';
import { getRequestId } from './request-context';
import { sendDraftChatwork } from './send-draft-chatwork';

export type SendDraftArgs = {
  firmId: string;
  userId: string;
  inquiryId: string;
  editedBody: string | null;
};

/**
 * Channel-aware send: routes the approved draft to the customer over whichever
 * channel the inquiry arrived on. Chatwork posts back to the room; everything
 * else replies by email. editedBody=null → send the persisted draft verbatim.
 */
export async function sendDraft(args: SendDraftArgs): Promise<void> {
  const inquiry = await getInquiry(args.firmId, args.inquiryId);
  if (!inquiry) throw new Error(`inquiry ${args.inquiryId} not found`);
  if (inquiry.channel === 'chatwork') {
    await sendDraftChatwork(args);
    return;
  }
  await sendDraftEmail(args);
}

/**
 * Send an inquiry's latest draft to the customer via Resend. Writes the outbound
 * Message-ID back to the draft's metadata so the next customer reply can be
 * threaded back to this draft via findDraftBySentMessageId.
 */
export async function sendDraftEmail(args: SendDraftArgs): Promise<void> {
  const [inquiry, draft, firm] = await Promise.all([
    getInquiry(args.firmId, args.inquiryId),
    getDraftByInquiry(args.firmId, args.inquiryId),
    getFirm(args.firmId),
  ]);
  if (!inquiry) throw new Error(`inquiry ${args.inquiryId} not found`);
  if (!draft) throw new Error(`no draft for inquiry ${args.inquiryId}`);
  if (!firm) throw new Error(`firm ${args.firmId} not found`);
  if (!inquiry.client) {
    throw new Error('cannot send reply: inquiry has no associated client (unmatched sender)');
  }
  if (!env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY not configured — cannot send outbound email');
  }

  const bodyToSend = args.editedBody ?? draft.body;
  const wasEdited = args.editedBody !== null && args.editedBody !== draft.body;
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
    tags: { idempotencyKey: draft.id, firmId: args.firmId, inquiryId: args.inquiryId },
  });

  await patchDraftMetadata(args.firmId, draft.id, {
    sentAt: new Date().toISOString(),
    channel: inquiry.channel,
    outboundMessageId: result.outboundMessageId,
    providerMessageId: result.providerMessageId,
  });
  await setInquiryStatus(args.firmId, args.inquiryId, 'sent');
  await recordAudit({
    firmId: args.firmId,
    actorId: args.userId,
    inquiryId: args.inquiryId,
    action: 'draft.sent',
    metadata: {
      channel: inquiry.channel,
      outboundMessageId: result.outboundMessageId,
      providerMessageId: result.providerMessageId,
      edited: wasEdited,
      ...(wasEdited
        ? {
            sentBody: bodyToSend,
            originalLength: draft.body.length,
            sentLength: bodyToSend.length,
          }
        : {}),
    },
  });

  // Compounding-learning loop: every sent draft becomes future knowledge for
  // the agent (chunked + embedded + indexed by autoAddKnowledgeFn). Without
  // this, the agent re-discovers the same answers every time the same kind
  // of question comes in. Inngest event id is idempotent per-draft so a
  // double-fire (e.g. user clicks send twice) is a no-op downstream.
  const requestId = getRequestId();
  await inngest.send({
    name: 'knowledge.auto_add',
    data: {
      firmId: args.firmId,
      inquiryId: args.inquiryId,
      draftId: draft.id,
      ...(requestId ? { requestId } : {}),
    },
    id: `auto-add-${draft.id}`,
  });
}
