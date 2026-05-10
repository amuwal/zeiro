import { type Attachment, type IncomingMessage, incomingMessageSchema } from '@zeiro/core';
import { Resend } from 'resend';
import { z } from 'zod';

export type ParsedMessage = IncomingMessage;

const resendInboundAttachmentSchema = z.object({
  filename: z.string().nullable().optional(),
  contentType: z.string().nullable().optional(),
  content: z.string().nullable().optional(),
  size: z.number().nullable().optional(),
});

const resendAddressSchema = z.union([
  z.string(),
  z.object({ address: z.string(), name: z.string().nullable().optional() }),
  z.array(
    z.union([
      z.string(),
      z.object({ address: z.string(), name: z.string().nullable().optional() }),
    ]),
  ),
]);

const resendInboundSchema = z.object({
  // The webhook event payload uses snake_case, the Resend API GET /emails/:id/receiving
  // response uses snake_case too — but earlier inbound integrations sometimes provided
  // camelCase. Accept both so the parser works whether we feed the raw webhook event,
  // the API GET response, or a hand-crafted payload.
  messageId: z.string().nullable().optional(),
  message_id: z.string().nullable().optional(),
  from: resendAddressSchema.optional(),
  to: resendAddressSchema.optional(),
  subject: z.string().nullable().optional(),
  text: z.string().nullable().optional(),
  html: z.string().nullable().optional(),
  inReplyTo: z.string().nullable().optional(),
  references: z
    .union([z.string(), z.array(z.string())])
    .nullable()
    .optional(),
  attachments: z.array(resendInboundAttachmentSchema).nullable().optional(),
  receivedAt: z.string().nullable().optional(),
  date: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
  headers: z.record(z.string(), z.string()).nullable().optional(),
});

export function parseResendInbound(payload: unknown): ParsedMessage {
  // Resend delivers email content in two shapes:
  //   1. webhook event: { type: 'email.received', data: {...metadata only, no body...} }
  //   2. GET /emails/:id/receiving response: full message with text/html/headers
  // Unwrap the event envelope if present, then parse. The webhook route should fetch
  // shape 2 before parsing — shape 1 alone yields an empty body.
  const inner =
    payload && typeof payload === 'object' && 'data' in payload
      ? (payload as { data: unknown }).data
      : payload;
  const data = resendInboundSchema.parse(inner);
  const headerMap = data.headers ?? {};
  const inReplyToRaw =
    data.inReplyTo ?? headerMap['In-Reply-To'] ?? headerMap['in-reply-to'] ?? null;
  const referencesRaw = data.references ?? headerMap.References ?? headerMap.references ?? null;
  const fromParts = extractFirstAddress(data.from);
  return incomingMessageSchema.parse({
    messageId: stripAngles(data.message_id ?? data.messageId ?? null) ?? generateMessageId(),
    receivedAt: normaliseDatetime(data.receivedAt ?? data.created_at ?? data.date ?? null),
    fromAddress: fromParts.email,
    fromName: fromParts.name,
    toAddress: extractFirstAddress(data.to).email,
    subject: data.subject ?? '',
    body: data.text ?? data.html ?? '',
    attachments: (data.attachments ?? [])
      .map(toAttachment)
      .filter((a): a is Attachment => a !== null),
    headers: {
      inReplyTo: stripAngles(inReplyToRaw) ?? null,
      references: normaliseReferences(referencesRaw),
      ...(fromParts.name ? { fromName: fromParts.name } : {}),
    },
  });
}

function extractFirstAddress(field: z.infer<typeof resendAddressSchema> | undefined): {
  email: string;
  name: string | null;
} {
  if (!field) return { email: '', name: null };
  const first = Array.isArray(field) ? field[0] : field;
  if (!first) return { email: '', name: null };
  if (typeof first === 'string') return parseAddressString(first);
  return {
    email: (first.address ?? '').trim().toLowerCase(),
    name: cleanName(first.name ?? null),
  };
}

function parseAddressString(raw: string): { email: string; name: string | null } {
  // Handles RFC 5322 forms: `"Display Name" <user@host>` / `Display <user@host>` / `user@host`
  const angleMatch = raw.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  if (angleMatch) {
    const namePart = angleMatch[1] ?? '';
    const emailPart = angleMatch[2] ?? '';
    return { email: emailPart.trim().toLowerCase(), name: cleanName(namePart) };
  }
  return { email: raw.trim().toLowerCase(), name: null };
}

function cleanName(raw: string | null): string | null {
  if (!raw) return null;
  const stripped = raw
    .trim()
    .replace(/^"(.*)"$/, '$1')
    .trim();
  return stripped.length > 0 ? stripped : null;
}

function toAttachment(att: z.infer<typeof resendInboundAttachmentSchema>): Attachment | null {
  if (!att.filename || !att.content) return null;
  return {
    filename: att.filename,
    contentType: att.contentType ?? 'application/octet-stream',
    sizeBytes: att.size ?? Buffer.from(att.content, 'base64').length,
    contentBase64: att.content,
  };
}

function stripAngles(id: string | null | undefined): string | undefined {
  if (!id) return undefined;
  const match = id.match(/<([^>]+)>/);
  return (match?.[1] ?? id).trim();
}

function normaliseReferences(refs: string | string[] | null | undefined): string[] {
  if (!refs) return [];
  const list = Array.isArray(refs) ? refs : refs.split(/\s+/);
  return list.map((r) => stripAngles(r)).filter((r): r is string => Boolean(r));
}

function generateMessageId(): string {
  return `inbound-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// Resend returns `created_at` in formats that Zod's strict `.datetime()` regex
// rejects (e.g. `2026-05-10 14:35:00`, `+00:00` offset, missing milliseconds).
// We don't care about preserving the original wire format — normalise everything
// to a UTC ISO 8601 string with `Z`, falling back to "now" if unparseable.
function normaliseDatetime(input: string | null | undefined): string {
  if (input) {
    const parsed = new Date(input);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return new Date().toISOString();
}

export async function fetchResendInboundEmail(apiKey: string, emailId: string): Promise<unknown> {
  const resend = new Resend(apiKey);
  const result = await resend.emails.receiving.get(emailId);
  if (result.error) {
    throw new Error(`Resend GET /emails/${emailId}/receiving failed: ${result.error.message}`);
  }
  return result.data;
}
