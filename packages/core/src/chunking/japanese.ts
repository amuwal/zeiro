export type Chunk = {
  text: string;
  startSentence: number;
  endSentence: number;
};

export type ChunkOptions = {
  maxChars: number;
  overlapSentences: number;
};

const DEFAULTS: ChunkOptions = { maxChars: 400, overlapSentences: 1 };

export function chunkJapanese(input: string, opts: Partial<ChunkOptions> = {}): Chunk[] {
  const { maxChars, overlapSentences } = { ...DEFAULTS, ...opts };
  const sentences = splitSentences(input);
  if (sentences.length === 0) return [];

  const chunks: Chunk[] = [];
  let buffer: string[] = [];
  let bufferStart = 0;

  for (let i = 0; i < sentences.length; i++) {
    const next = sentences[i];
    const wouldExceed = buffer.join('').length + next.length > maxChars;

    if (wouldExceed && buffer.length > 0) {
      chunks.push(makeChunk(buffer, bufferStart, i - 1));
      const overlap = buffer.slice(-overlapSentences);
      buffer = [...overlap, next];
      bufferStart = i - overlap.length;
    } else {
      buffer.push(next);
    }
  }

  if (buffer.length > 0) {
    chunks.push(makeChunk(buffer, bufferStart, sentences.length - 1));
  }
  return chunks;
}

function splitSentences(text: string): string[] {
  const out: string[] = [];
  const re = /[^。．！？\n!?]+(?:[。．！？\n!?]+|$)/gu;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const piece = m[0];
    if (piece.trim().length > 0) out.push(piece);
  }
  return out;
}

function makeChunk(parts: string[], start: number, end: number): Chunk {
  return { text: parts.join('').trim(), startSentence: start, endSentence: end };
}
