import { type InquiryHeaders, maskMyNumber } from '@zeiro/core';
import {
  createInquiry,
  findClientByEmail,
  findDraftByOutboundMessageId,
  findDraftBySentMessageId,
  findFirmByInboundAddress,
  findInquiryByMessageId,
  recordAudit,
} from '@zeiro/db';
import type { ParsedMessage } from '@zeiro/email';
import { parseInboundAttachments } from './inbound-attachments';
import { inngest } from './inngest/client';
import { getRequestId } from './request-context';

const SYSTEM_ACTOR = '00000000-0000-0000-0000-000000000000';

export type ProcessOutcome =
  | { kind: 'unmatched_firm' }
  | { kind: 'unmatched_persisted'; firmId: string; inquiryId: string }
  | { kind: 'duplicate'; inquiryId: string }
  | { kind: 'queued'; inquiryId: string };

export async function processInbound(message: ParsedMessage): Promise<ProcessOutcome> {
  const firm = await findFirmByInboundAddress(message.toAddress);
  if (!firm) return { kind: 'unmatched_firm' };

  const attachmentSummary = await parseInboundAttachments(message.attachments);
  const combinedBody = message.body + attachmentSummary.appendedText;
  const { masked: maskedBody, redactionCount } = maskMyNumber(combinedBody);
  const parentInquiryId = await findParentInquiryId(firm.id, message.headers);

  const client = await findClientByEmail(firm.id, message.fromAddress);

  if (!client) {
    const unmatched = await createInquiry({
      firmId: firm.id,
      clientId: null,
      messageId: message.messageId,
      receivedAt: message.receivedAt,
      subject: message.subject,
      body: maskedBody,
      ...(message.headers ? { headers: message.headers } : {}),
      status: 'unmatched',
      unmatchedSender: message.fromAddress,
      parentInquiryId,
    });
    await recordAudit({
      firmId: firm.id,
      actorId: SYSTEM_ACTOR,
      inquiryId: unmatched.id,
      action: 'inquiry.received',
      metadata: {
        unmatched: true,
        fromAddress: message.fromAddress,
        messageId: message.messageId,
        piiRedactions: redactionCount,
      },
    });
    return { kind: 'unmatched_persisted', firmId: firm.id, inquiryId: unmatched.id };
  }

  // Default assignment policy:
  //   • If the client has an assigned tax accountant, inherit it. That's the
  //     stable case — incoming mail goes to the same human the client always
  //     deals with.
  //   • If the client has no assignee, leave the inquiry unassigned. The
  //     inbox row shows a clear "未割り当て" chip; any reviewer can claim it
  //     by reassigning to themselves. We deliberately don't round-robin or
  //     pick the oldest admin because that creates queue churn for that one
  //     person every time a new client without an explicit 担当 comes in.
  //
  // Draft generation runs independently of assignment — the AI does its work
  // regardless of who'll review.
  const insert = await createInquiry({
    firmId: firm.id,
    clientId: client.id,
    messageId: message.messageId,
    receivedAt: message.receivedAt,
    subject: message.subject,
    body: maskedBody,
    ...(message.headers ? { headers: message.headers } : {}),
    assignedToId: client.assignedTaxAccountantId,
    parentInquiryId,
  });

  await recordAudit({
    firmId: firm.id,
    actorId: SYSTEM_ACTOR,
    inquiryId: insert.id,
    action: 'inquiry.received',
    metadata: {
      messageId: message.messageId,
      piiRedactions: redactionCount,
      parentInquiryId,
      attachments: {
        parsed: attachmentSummary.parsed,
        skipped: attachmentSummary.skipped,
        appendedChars: attachmentSummary.appendedText.length,
      },
    },
  });

  if (insert.kind === 'duplicate') return { kind: 'duplicate', inquiryId: insert.id };

  const requestId = getRequestId();
  await inngest.send({
    name: 'inquiry.queued',
    data: { firmId: firm.id, inquiryId: insert.id, ...(requestId ? { requestId } : {}) },
    id: `inquiry-${insert.id}`,
  });

  return { kind: 'queued', inquiryId: insert.id };
}

// Walk the In-Reply-To + References chain and try every match path that could
// resolve the parent. Three lookup passes per candidate Message-ID:
//   1. drafts.metadata.outboundMessageId — our custom `<draftId@reply.zeiro.io>`.
//      Matches when Resend respected our header (verified domain path).
//   2. drafts.metadata.sentMessageId — the SES-assigned Message-ID captured from
//      the email.sent webhook. Matches when Resend rewrote our Message-ID into
//      SES's `01...@ap-northeast-1.amazonses.com` form (unverified domain path).
//   3. inquiries.message_id — a prior customer message in the same firm.
//      Matches when Gmail anchored the reply on the customer's own prior email
//      instead of on our reply (very common — Gmail picks whichever is closest).
//
// Any one match means "this email belongs to that conversation."
async function findParentInquiryId(
  firmId: string,
  headers: InquiryHeaders | undefined,
): Promise<string | null> {
  if (!headers) return null;
  const candidates = [headers.inReplyTo, ...headers.references].filter(
    (s): s is string => typeof s === 'string' && s.length > 0,
  );
  for (const messageId of candidates) {
    const draftByOutbound = await findDraftByOutboundMessageId(messageId);
    if (draftByOutbound) return draftByOutbound.inquiryId;
    const draftBySent = await findDraftBySentMessageId(messageId);
    if (draftBySent) return draftBySent.inquiryId;
    const priorInquiry = await findInquiryByMessageId(firmId, messageId);
    if (priorInquiry) return priorInquiry.id;
  }
  return null;
}
