import { extractEmailText } from '@zeiro/email';
import mammoth from 'mammoth';
import { extractText } from 'unpdf';

export type ParsedDocument = {
  text: string;
  metadata: { kind: 'text' | 'email' | 'pdf' | 'docx'; filename?: string; pages?: number };
};

const TEXT_EXTENSIONS = new Set(['txt', 'md', 'markdown']);
const EMAIL_EXTENSIONS = new Set(['eml', 'mbox']);
const PDF_EXTENSIONS = new Set(['pdf']);
const DOCX_EXTENSIONS = new Set(['docx']);

export async function parseKnowledgeFile(file: File): Promise<ParsedDocument> {
  const ext = filenameExtension(file.name);
  const buffer = Buffer.from(await file.arrayBuffer());

  if (PDF_EXTENSIONS.has(ext) || file.type === 'application/pdf') {
    const result = await extractText(new Uint8Array(buffer), { mergePages: true });
    return {
      text: result.text,
      metadata: { kind: 'pdf', filename: file.name, pages: result.totalPages },
    };
  }

  if (
    DOCX_EXTENSIONS.has(ext) ||
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return {
      text: result.value,
      metadata: { kind: 'docx', filename: file.name },
    };
  }

  if (EMAIL_EXTENSIONS.has(ext) || file.type === 'message/rfc822') {
    const text = await extractEmailText(buffer.toString('utf-8'));
    return { text, metadata: { kind: 'email', filename: file.name } };
  }

  if (TEXT_EXTENSIONS.has(ext) || file.type.startsWith('text/')) {
    return { text: buffer.toString('utf-8'), metadata: { kind: 'text', filename: file.name } };
  }

  throw new ParserError(
    `対応していないファイル形式です: ${ext || file.type || '(unknown)'}。 .pdf / .docx / .txt / .md / .eml に対応しています。`,
  );
}

export class ParserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ParserError';
  }
}

function filenameExtension(name: string): string {
  const dot = name.lastIndexOf('.');
  if (dot === -1) return '';
  return name.slice(dot + 1).toLowerCase();
}
