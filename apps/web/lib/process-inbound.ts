import { maskMyNumber } from '@zeiro/core';
import {
  createInquiry,
  findClientByEmail,
  findFirmByInboundAddress,
  recordAudit,
} from '@zeiro/db';
import type { ParsedMessage } from '@zeiro/email';
import { inngest } from './inngest/client';

const SYSTEM_ACTOR = '00000000-0000-0000-0000-000000000000';

export type ProcessOutcome =
  | { kind: 'unmatched_firm' }
  | { kind: 'unmatched_client'; firmId: string }
  | { kind: 'duplicate'; inquiryId: string }
  | { kind: 'queued'; inquiryId: string };

export async function processInbound(message: ParsedMessage): Promise<ProcessOutcome> {
  const firm = await findFirmByInboundAddress(message.toAddress);
  if (!firm) return { kind: 'unmatched_firm' };

  const client = await findClientByEmail(firm.id, message.fromAddress);
  if (!client) {
    await recordAudit({
      firmId: firm.id,
      actorId: SYSTEM_ACTOR,
      inquiryId: null,
      action: 'inquiry.received',
      metadata: { unmatched: true, fromAddress: message.fromAddress, messageId: message.messageId },
    });
    return { kind: 'unmatched_client', firmId: firm.id };
  }

  const { masked: maskedBody, redactionCount } = maskMyNumber(message.body);

  const insert = await createInquiry({
    firmId: firm.id,
    clientId: client.id,
    messageId: message.messageId,
    receivedAt: message.receivedAt,
    subject: message.subject,
    body: maskedBody,
    headers: message.headers,
    assignedToId: client.assignedTaxAccountantId,
  });

  await recordAudit({
    firmId: firm.id,
    actorId: SYSTEM_ACTOR,
    inquiryId: insert.id,
    action: 'inquiry.received',
    metadata: { messageId: message.messageId, piiRedactions: redactionCount },
  });

  if (insert.kind === 'duplicate') return { kind: 'duplicate', inquiryId: insert.id };

  await inngest.send({
    name: 'inquiry.queued',
    data: { firmId: firm.id, inquiryId: insert.id },
    id: `inquiry-${insert.id}`,
  });

  return { kind: 'queued', inquiryId: insert.id };
}
