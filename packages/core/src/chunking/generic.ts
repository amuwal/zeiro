import type { Chunk, ChunkOptions } from './japanese';

// Language-agnostic chunker for documents that don't fit the
// Japanese-punctuation splitter. Implements a small recursive splitter in the
// spirit of LangChain's RecursiveCharacterTextSplitter: try paragraph breaks
// first, then sentence punctuation, then whitespace, then hard character cuts.
// The split priorities are chosen so the chunker never produces zero-length
// or arbitrarily-cut chunks on edge inputs.

const DEFAULTS: ChunkOptions = { maxChars: 800, overlapSentences: 1 };
const SEPARATORS = ['\n\n', '\n', '. ', '。', '! ', '? ', '! ', '? ', ' ', ''];

export function chunkGeneric(input: string, opts: Partial<ChunkOptions> = {}): Chunk[] {
  const cfg = { ...DEFAULTS, ...opts };
  const cleaned = input.trim();
  if (cleaned.length === 0) return [];

  const pieces = splitRecursively(cleaned, cfg.maxChars, 0);
  const chunks: Chunk[] = [];
  for (let i = 0; i < pieces.length; i++) {
    const piece = pieces[i];
    if (!piece) continue;
    chunks.push({ text: piece, startSentence: i, endSentence: i });
  }
  return applyOverlap(chunks, cfg.overlapSentences);
}

function splitRecursively(text: string, maxChars: number, sepIdx: number): string[] {
  if (text.length <= maxChars) return [text];
  const separator = SEPARATORS[sepIdx] ?? '';
  if (separator === '') {
    // Last resort: hard cut at the size limit. Used only when the input has
    // no whitespace or punctuation at all (concatenated CJK without 。 or
    // codepoints from generated formats).
    const out: string[] = [];
    for (let i = 0; i < text.length; i += maxChars) {
      out.push(text.slice(i, i + maxChars));
    }
    return out;
  }

  const parts = text.split(separator);
  const out: string[] = [];
  let buffer = '';
  for (const part of parts) {
    const candidate = buffer.length === 0 ? part : `${buffer}${separator}${part}`;
    if (candidate.length <= maxChars) {
      buffer = candidate;
      continue;
    }
    if (buffer.length > 0) {
      out.push(buffer);
      buffer = '';
    }
    if (part.length > maxChars) {
      out.push(...splitRecursively(part, maxChars, sepIdx + 1));
    } else {
      buffer = part;
    }
  }
  if (buffer.length > 0) out.push(buffer);
  return out;
}

function applyOverlap(chunks: Chunk[], overlap: number): Chunk[] {
  if (overlap <= 0 || chunks.length <= 1) return chunks;
  const out: Chunk[] = [chunks[0] as Chunk];
  for (let i = 1; i < chunks.length; i++) {
    const prev = chunks[i - 1] as Chunk;
    const curr = chunks[i] as Chunk;
    const tail = prev.text.slice(-Math.min(prev.text.length, 200 * overlap));
    out.push({
      text: `${tail}\n${curr.text}`,
      startSentence: curr.startSentence,
      endSentence: curr.endSentence,
    });
  }
  return out;
}
