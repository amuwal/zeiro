import { chunkGeneric } from './generic';
import { type Chunk, type ChunkOptions, chunkJapanese } from './japanese';

// Pick the right chunker based on the document's detected language. Japanese
// (and Chinese, which uses the same end-of-sentence punctuation) routes to
// the punctuation-aware splitter; everything else falls back to the recursive
// character splitter which is safe for arbitrary scripts.
export function chunkByLanguage(
  text: string,
  language: string | undefined,
  opts: Partial<ChunkOptions> = {},
): Chunk[] {
  if (language === 'ja' || language === 'zh') {
    const chunks = chunkJapanese(text, opts);
    // Fall back to the generic chunker on inputs the punctuation splitter
    // can't handle (e.g. a Japanese DOCX with markdown headings but no 。).
    if (chunks.length === 0) return chunkGeneric(text, opts);
    return chunks;
  }
  return chunkGeneric(text, opts);
}
