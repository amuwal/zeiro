import type { Attachment } from '@zeiro/core';
import { type ParsedKind, ParserError, parseDocument } from './knowledge-parser';

const PER_ATTACH_CHAR_CAP = 5_000;
const TOTAL_CHAR_CAP = 30_000;

export type AttachmentParseSummary = {
  appendedText: string;
  parsed: Array<{
    filename: string;
    kind: ParsedKind;
    chars: number;
    pages?: number;
  }>;
  skipped: Array<{ filename: string; mimetype: string; reason: string }>;
};

export async function parseInboundAttachments(
  attachments: Attachment[],
): Promise<AttachmentParseSummary> {
  const parsed: AttachmentParseSummary['parsed'] = [];
  const skipped: AttachmentParseSummary['skipped'] = [];
  const blocks: string[] = [];
  let totalChars = 0;

  for (const att of attachments) {
    if (totalChars >= TOTAL_CHAR_CAP) {
      skipped.push({
        filename: att.filename,
        mimetype: att.contentType,
        reason: 'total-cap',
      });
      continue;
    }
    try {
      const buffer = Buffer.from(att.contentBase64, 'base64');
      const result = await parseDocument({
        buffer,
        filename: att.filename,
        mimetype: att.contentType,
      });
      const remaining = TOTAL_CHAR_CAP - totalChars;
      const text = result.text.trim().slice(0, Math.min(PER_ATTACH_CHAR_CAP, remaining));
      if (!text) {
        skipped.push({
          filename: att.filename,
          mimetype: att.contentType,
          reason: 'empty',
        });
        continue;
      }
      const headerLabel = result.metadata.pages
        ? `${att.filename} (${result.metadata.pages}ページ)`
        : att.filename;
      blocks.push(`\n\n----- 添付: ${headerLabel} -----\n${text}`);
      const entry: AttachmentParseSummary['parsed'][number] = {
        filename: att.filename,
        kind: result.metadata.kind,
        chars: text.length,
        ...(result.metadata.pages !== undefined ? { pages: result.metadata.pages } : {}),
      };
      parsed.push(entry);
      totalChars += text.length;
    } catch (e) {
      const reason =
        e instanceof ParserError ? 'unsupported' : e instanceof Error ? e.message : 'parse-failed';
      skipped.push({ filename: att.filename, mimetype: att.contentType, reason });
    }
  }

  return { appendedText: blocks.join(''), parsed, skipped };
}
