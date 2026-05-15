import { getDocumentProxy, extractText as unpdfExtract } from 'unpdf';
import { pdfjsOptions } from '../pdfjs-options';
import { cleanCjkSpacing } from '../text-clean';
import type { Extraction, ExtractionWarning } from '../types';

// Per-page text density below this threshold (characters per page) suggests
// the page is mostly an image — possibly a scan, possibly a diagram. Used by
// the router to decide whether to escalate to OCR. Empirically: a typed page
// of body text holds ~1,500–3,000 characters; a "table of figures" sparse
// layout sits around 400; below 50 it's almost certainly image-only.
export const TEXT_PDF_PAGE_DENSITY_THRESHOLD = 80;

export type PdfExtraction = Extraction & {
  pages: number;
  perPageChars: number[];
  // The router uses this to gate the OCR fallback. A "scanned page" is one
  // that fell below the density threshold; if a meaningful fraction of the
  // document looks like that, we OCR the whole thing.
  scannedPages: number;
};

export async function extractPdfText(buffer: Buffer): Promise<PdfExtraction> {
  // Open the document with pdfjs configured for CJK character maps + standard
  // fonts, then hand the proxy to unpdf — avoids the "cMapUrl missing"
  // warning chain that corrupts Japanese text extraction.
  const pdf = await getDocumentProxy(new Uint8Array(buffer), pdfjsOptions());
  const result = await unpdfExtract(pdf, { mergePages: false });
  // pdfjs emits one space between every glyph it lays out, which for CJK text
  // turns 「国税庁」 into 「国 税 庁」. Strip those before downstream language
  // detection and chunking — both rely on contiguous CJK runs to work.
  const rawPages = Array.isArray(result.text) ? result.text : [result.text];
  const pages = rawPages.map((p) => cleanCjkSpacing(p ?? ''));
  const perPageChars = pages.map((p) => p?.length ?? 0);
  const scannedPages = perPageChars.filter((c) => c < TEXT_PDF_PAGE_DENSITY_THRESHOLD).length;

  const warnings: ExtractionWarning[] = [];
  if (scannedPages > 0) warnings.push('low-text-density');
  if (pages.length === 0) warnings.push('short-output');

  return {
    text: pages.join('\n\n').trim(),
    kind: 'pdf',
    pages: result.totalPages,
    perPageChars,
    scannedPages,
    warnings,
    meta: {
      avgCharsPerPage:
        perPageChars.length > 0
          ? Math.round(perPageChars.reduce((s, n) => s + n, 0) / perPageChars.length)
          : 0,
    },
  };
}
