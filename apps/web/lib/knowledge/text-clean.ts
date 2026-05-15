// Text-normalisation helpers shared between PDF and OCR extractors. Kept tiny
// and side-effect free so the chunker and language detector both see the same
// canonical form.

const CJK = '\\p{Script=Hiragana}\\p{Script=Katakana}\\p{Script=Han}';

// Collapse whitespace between two adjacent CJK glyphs — both pdfjs and
// tesseract insert spurious spaces here (pdfjs lays out one space per glyph
// boundary; tesseract leaks `preserve_interword_spaces` artifacts). The rest
// of the document's whitespace (between Latin words, between paragraphs) is
// preserved.
const CJK_INTERIOR_SPACES = new RegExp(`(?<=[${CJK}])[ \\t]+(?=[${CJK}])`, 'gu');

export function cleanCjkSpacing(text: string): string {
  return text.replace(CJK_INTERIOR_SPACES, '');
}

// Heuristic: text that's >40% non-letter symbols and punctuation is almost
// certainly OCR garbage from a form layout (boxes, grid lines, checkmarks
// mis-recognised as glyphs). Returns true so the caller can mark the
// extraction `short-output` / `requiresReview`.
export function looksLikeGarbageOcr(text: string): boolean {
  const trimmed = text.replace(/\s+/g, '');
  if (trimmed.length < 80) return false;
  const symbolish = trimmed.match(
    /[^\p{L}\p{N}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/gu,
  );
  const ratio = (symbolish?.length ?? 0) / trimmed.length;
  return ratio > 0.4;
}
