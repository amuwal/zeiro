import type { Attachment } from '@zeiro/core';
import type { Attachment as ParsedAttachment } from 'mailparser';

export function extractAttachments(parts: ParsedAttachment[]): Attachment[] {
  return parts.filter((p) => p.contentDisposition !== 'inline' || p.filename).map(toAttachment);
}

function toAttachment(part: ParsedAttachment): Attachment {
  return {
    filename: part.filename ?? 'attachment',
    contentType: part.contentType ?? 'application/octet-stream',
    sizeBytes: part.size ?? part.content.length,
    contentBase64: Buffer.from(part.content).toString('base64'),
  };
}
