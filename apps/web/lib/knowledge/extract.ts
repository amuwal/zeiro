import { extractDocx } from './extractors/docx';
import { extractPdfText, TEXT_PDF_PAGE_DENSITY_THRESHOLD } from './extractors/pdf';
import { extractPdfWithOcr } from './extractors/pdf-ocr';
import { extractEmail, extractText } from './extractors/text';
import { extractCsv, extractXlsx } from './extractors/xlsx';
import { detectLanguage } from './language';
import { preflight } from './preflight';
import { type Extraction, type ParseInput, ParserError } from './types';

// Conservative gate: only escalate to OCR when the text path produced almost
// nothing. Sparse layouts (税務署 forms, brochures with mostly figures) still
// extract real labels via pdfjs — that text is useful as RAG context, and we
// don't want to throw it away just because it didn't look like prose. OCR
// only kicks in when the document looks genuinely image-only.
const OCR_TRIGGER_MAX_CHARS_PER_PAGE = 20;

export type ExtractOptions = {
  // Set to false to bypass the OCR fallback (used by the API surface to
  // expose a "text-only / no OCR" mode for users who want to keep ingestion
  // fast and local-libs-only). Default true.
  allowOcr?: boolean;
};

export async function extract(input: ParseInput, opts: ExtractOptions = {}): Promise<Extraction> {
  const pre = await preflight(input);
  const allowOcr = opts.allowOcr ?? true;

  let extraction: Extraction;
  switch (pre.canonical) {
    case 'pdf':
      extraction = await extractPdfRouted(input.buffer, allowOcr);
      break;
    case 'docx':
      extraction = await extractDocx(input.buffer);
      break;
    case 'xlsx':
      extraction = extractXlsx(input.buffer);
      break;
    case 'csv':
      extraction = extractCsv(input.buffer);
      break;
    case 'email':
      extraction = await extractEmail(input.buffer);
      break;
    case 'markdown':
      extraction = extractText(input.buffer, 'markdown');
      break;
    case 'text':
      extraction = extractText(input.buffer, 'text');
      break;
    default:
      throw new ParserError('unsupported_format', `内部エラー: ${pre.canonical}`);
  }

  if (extraction.text.trim().length === 0) {
    throw new ParserError(
      'empty_extraction',
      'ファイルからテキストを抽出できませんでした。スキャン画像のみの場合はOCRをお試しください。',
    );
  }

  extraction.detectedLanguage = detectLanguage(extraction.text);
  return extraction;
}

async function extractPdfRouted(buffer: Buffer, allowOcr: boolean): Promise<Extraction> {
  const text = await extractPdfText(buffer);
  if (!allowOcr) return text;
  if (text.pages === 0) return text;

  const totalChars = text.text.length;
  const avgPerPage = totalChars / text.pages;
  if (avgPerPage >= OCR_TRIGGER_MAX_CHARS_PER_PAGE) return text;

  // The text path returned almost nothing — looks image-only. Try OCR. If
  // that also fails, fall back to whatever the text path produced so we
  // never lose extracted content just because the rescue path tripped.
  try {
    const ocr = await extractPdfWithOcr(buffer);
    ocr.meta = {
      ...ocr.meta,
      escalatedFromTextPdf: true,
      textPathChars: totalChars,
      textPathAvgPerPage: Math.round(avgPerPage),
      densityThreshold: TEXT_PDF_PAGE_DENSITY_THRESHOLD,
    };
    return ocr;
  } catch (_e) {
    // OCR failed — keep what the text path got, mark short-output so the
    // chunk gets `requiresReview: true` and the reviewer sees the gap.
    text.warnings.push('short-output');
    text.meta = { ...text.meta, ocrAttemptFailed: true };
    return text;
  }
}
