import { type IncomingMessage, incomingMessageSchema } from '@zeiro/core';
import { type AddressObject, simpleParser } from 'mailparser';
import { extractAttachments } from './attachments';

export type ParsedMessage = IncomingMessage;

export async function parseSendGridInbound(form: FormData): Promise<ParsedMessage> {
  const rawMime = form.get('email');
  if (typeof rawMime !== 'string' || rawMime.length === 0) {
    throw new Error(
      'SendGrid Inbound Parse must be in raw-MIME mode (POST raw, full MIME message)',
    );
  }

  const parsed = await simpleParser(rawMime);

  return incomingMessageSchema.parse({
    messageId: stripAngles(parsed.messageId) ?? generateMessageId(),
    receivedAt: (parsed.date ?? new Date()).toISOString(),
    fromAddress: firstAddress(parsed.from),
    toAddress: firstAddress(parsed.to),
    subject: parsed.subject ?? '',
    body: parsed.text ?? parsed.html ?? '',
    attachments: extractAttachments(parsed.attachments ?? []),
    headers: {
      inReplyTo: stripAngles(parsed.inReplyTo) ?? null,
      references: normaliseReferences(parsed.references),
    },
  });
}

function firstAddress(field: AddressObject | AddressObject[] | undefined): string {
  const obj = Array.isArray(field) ? field[0] : field;
  return obj?.value?.[0]?.address?.trim().toLowerCase() ?? '';
}

function stripAngles(id: string | undefined): string | undefined {
  if (!id) return undefined;
  const match = id.match(/<([^>]+)>/);
  return (match?.[1] ?? id).trim();
}

function normaliseReferences(refs: string | string[] | undefined): string[] {
  if (!refs) return [];
  const list = Array.isArray(refs) ? refs : refs.split(/\s+/);
  return list.map((r) => stripAngles(r)).filter((r): r is string => Boolean(r));
}

function generateMessageId(): string {
  return `inbound-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
