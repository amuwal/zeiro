import { fileTypeFromBuffer } from 'file-type';
import { getDocumentProxy } from 'unpdf';
import { pdfjsOptions } from './pdfjs-options';
import { type ParseInput, ParserError } from './types';

// Hard cap on accepted uploads. Larger files almost always indicate the wrong
// thing (a video, a CAD export, a backup). The pipeline needs to refuse early
// before Next.js' own 4MB body limit kicks in with a less informative 413.
const MAX_BYTES = 20 * 1024 * 1024; // 20 MiB

// Magic-byte → canonical kind mapping. Extension is unreliable (.txt holding a
// PDF, missing extensions on emailed files), so we always sniff first.
const SNIFFED_TO_KIND: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
};

export type Preflight = {
  filename: string;
  bytes: number;
  // Resolved canonical kind: 'pdf' | 'docx' | 'xlsx' | 'email' | 'text' | 'markdown' | 'unknown'.
  // Used by the extraction router to pick a strategy.
  canonical: string;
  // For PDF only — whether the file is encrypted/password-protected. Other
  // extractors do their own detection.
  passwordProtected: boolean;
};

export async function preflight(input: ParseInput): Promise<Preflight> {
  if (input.buffer.length > MAX_BYTES) {
    throw new ParserError(
      'file_too_large',
      `ファイルサイズが上限 (${Math.round(MAX_BYTES / 1024 / 1024)}MB) を超えています`,
    );
  }
  if (input.buffer.length === 0) {
    throw new ParserError('corrupted_file', 'ファイルが空です');
  }

  const ext = filenameExtension(input.filename);
  const sniffed = await fileTypeFromBuffer(new Uint8Array(input.buffer));
  const canonical = resolveKind({ ext, mimetype: input.mimetype, sniffed: sniffed?.mime });

  if (canonical === 'pdf') {
    const encrypted = await isEncryptedPdf(input.buffer);
    if (encrypted) {
      throw new ParserError(
        'password_protected',
        'パスワード保護されたPDFは対応していません。解除してから再アップロードしてください。',
      );
    }
  }

  if (canonical === 'unknown') {
    const seen = sniffed?.mime ?? input.mimetype ?? ext ?? '不明';
    throw new ParserError(
      'unsupported_format',
      `対応していないファイル形式です: ${seen}. .pdf / .docx / .xlsx / .csv / .txt / .md / .eml に対応しています。`,
    );
  }

  return {
    filename: input.filename,
    bytes: input.buffer.length,
    canonical,
    passwordProtected: false,
  };
}

function resolveKind(args: {
  ext: string;
  mimetype: string | undefined;
  sniffed: string | undefined;
}): string {
  // Sniffed bytes are authoritative when the format has a stable magic number.
  // The library returns nothing for plain text formats — fall back to extension.
  if (args.sniffed && SNIFFED_TO_KIND[args.sniffed]) {
    return SNIFFED_TO_KIND[args.sniffed] as string;
  }
  if (args.ext === 'pdf') return 'pdf';
  if (args.ext === 'docx') return 'docx';
  if (args.ext === 'xlsx') return 'xlsx';
  if (args.ext === 'csv') return 'csv';
  if (args.ext === 'eml' || args.ext === 'mbox') return 'email';
  if (args.mimetype === 'message/rfc822') return 'email';
  if (args.ext === 'md' || args.ext === 'markdown') return 'markdown';
  if (args.ext === 'txt') return 'text';
  if (args.mimetype?.startsWith('text/')) return 'text';
  return 'unknown';
}

function filenameExtension(name: string): string {
  const dot = name.lastIndexOf('.');
  if (dot === -1) return '';
  return name.slice(dot + 1).toLowerCase();
}

// pdfjs throws a `PasswordException` when asked to open an encrypted PDF
// without a password. We let it tell us — much more reliable than scanning
// for `/Encrypt` in the raw bytes, since that string also appears in legal
// non-encrypted cross-reference streams.
async function isEncryptedPdf(buffer: Buffer): Promise<boolean> {
  try {
    await getDocumentProxy(new Uint8Array(buffer), pdfjsOptions());
    return false;
  } catch (e) {
    const msg = (e as Error).message ?? '';
    const name = (e as Error).name ?? '';
    return name === 'PasswordException' || /password/i.test(msg);
  }
}
