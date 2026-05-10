import { extractEmailText } from '@zeiro/email';
import mammoth from 'mammoth';
import { extractText } from 'unpdf';

export type ParsedKind = 'text' | 'email' | 'pdf' | 'docx';

export type ParsedDocument = {
  text: string;
  metadata: { kind: ParsedKind; filename?: string; pages?: number };
};

export type ParseInput = {
  buffer: Buffer;
  filename: string;
  mimetype?: string;
};

const TEXT_EXTENSIONS = new Set(['txt', 'md', 'markdown']);
const EMAIL_EXTENSIONS = new Set(['eml', 'mbox']);

export async function parseDocument(input: ParseInput): Promise<ParsedDocument> {
  const ext = filenameExtension(input.filename);
  const mimetype = input.mimetype ?? '';

  if (ext === 'pdf' || mimetype === 'application/pdf') {
    const result = await extractText(new Uint8Array(input.buffer), { mergePages: true });
    return {
      text: result.text,
      metadata: { kind: 'pdf', filename: input.filename, pages: result.totalPages },
    };
  }

  if (
    ext === 'docx' ||
    mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    const result = await mammoth.extractRawText({ buffer: input.buffer });
    return {
      text: result.value,
      metadata: { kind: 'docx', filename: input.filename },
    };
  }

  if (EMAIL_EXTENSIONS.has(ext) || mimetype === 'message/rfc822') {
    const text = await extractEmailText(input.buffer.toString('utf-8'));
    return { text, metadata: { kind: 'email', filename: input.filename } };
  }

  if (TEXT_EXTENSIONS.has(ext) || mimetype.startsWith('text/')) {
    return {
      text: input.buffer.toString('utf-8'),
      metadata: { kind: 'text', filename: input.filename },
    };
  }

  throw new ParserError(
    `対応していないファイル形式です: ${ext || mimetype || '(unknown)'}。 .pdf / .docx / .txt / .md / .eml に対応しています。`,
  );
}

export async function parseKnowledgeFile(file: File): Promise<ParsedDocument> {
  const buffer = Buffer.from(await file.arrayBuffer());
  return parseDocument({ buffer, filename: file.name, mimetype: file.type });
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
