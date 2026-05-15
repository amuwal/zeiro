import { getDocumentProxy, renderPageAsImage } from 'unpdf';
import { pdfjsOptions } from '../pdfjs-options';
import { cleanCjkSpacing, looksLikeGarbageOcr } from '../text-clean';
import type { Extraction, ExtractionWarning } from '../types';

// Render scale relative to a PDF point. 2.0 puts a typical A4 at ~1700x2400
// pixels — high enough for Tesseract to lock onto Japanese glyphs but not so
// high that OCR becomes a minute per page.
const RENDER_SCALE = 2.0;

export async function extractPdfWithOcr(buffer: Buffer): Promise<Extraction> {
  // Lazy-load tesseract.js — the worker pulls down language data on first use
  // and is heavy at import time. Keep the text-PDF path quick by deferring.
  const { createWorker } = await import('tesseract.js');
  // unpdf's `renderPageAsImage` handles canvas + cmap + standard-font wiring
  // for us, which removes a whole class of Path2D / cmap-fetch issues we'd
  // hit if we drove pdfjs directly from this side.
  const canvasImport = () => import('@napi-rs/canvas');
  const pdf = await getDocumentProxy(new Uint8Array(buffer), pdfjsOptions());

  const worker = await createWorker('jpn+eng');
  try {
    const pages: string[] = [];
    let renderFailures = 0;
    let ocrFailures = 0;
    for (let i = 1; i <= pdf.numPages; i++) {
      let pageText = '';
      try {
        const png = await renderPageAsImage(pdf, i, { scale: RENDER_SCALE, canvasImport });
        try {
          const { data } = await worker.recognize(Buffer.from(png));
          pageText = cleanOcrOutput(data.text);
        } catch {
          ocrFailures += 1;
        }
      } catch {
        renderFailures += 1;
      }
      pages.push(pageText);
    }

    const warnings: ExtractionWarning[] = [];
    if (renderFailures > 0 || ocrFailures > 0) warnings.push('partial-pages');
    const joined = pages.join('\n\n').trim();
    if (joined.length < 200) warnings.push('short-output');
    // Tesseract on a tax-form layout (grid, boxes, checkmarks) produces
    // believable-looking string lengths but mostly punctuation. Catch that
    // explicitly so the reviewer is alerted instead of trusting the chunks.
    if (looksLikeGarbageOcr(joined)) warnings.push('short-output');

    return {
      text: joined,
      kind: 'pdf-ocr',
      pages: pdf.numPages,
      warnings,
      meta: {
        ocrEngine: 'tesseract.js',
        languages: ['jpn', 'eng'],
        renderScale: RENDER_SCALE,
        ...(renderFailures > 0 ? { renderFailures } : {}),
        ...(ocrFailures > 0 ? { ocrFailures } : {}),
      },
    };
  } finally {
    await worker.terminate();
  }
}

function cleanOcrOutput(text: string): string {
  return cleanCjkSpacing(text)
    .replace(/­/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
