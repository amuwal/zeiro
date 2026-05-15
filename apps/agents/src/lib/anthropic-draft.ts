import Anthropic from '@anthropic-ai/sdk';
import { DRAFT_MODEL } from '@zeiro/core';

export type DocumentInput = {
  source: string;
  content: string;
};

export type CitationSpan = {
  source: string;
  citedText: string;
};

// One span of contiguous draft text, attributed to a (possibly empty) set of
// citation indexes into `citations`. Anthropic's Citations API emits the
// response as alternating text blocks, each carrying its own citations array;
// preserving that structure is what lets us show inline references in the UI.
export type DrafterBlock = {
  text: string;
  citationIndexes: number[];
};

export type DrafterResult = {
  text: string;
  citations: CitationSpan[];
  blocks: DrafterBlock[];
  usage: { inputTokens: number; outputTokens: number };
};

type CallInput = {
  apiKey: string;
  systemPrompt: string;
  userMessage: string;
  documents: DocumentInput[];
  maxTokens?: number;
};

export async function callDrafterWithCitations(input: CallInput): Promise<DrafterResult> {
  const client = new Anthropic({ apiKey: input.apiKey });

  const documentBlocks = input.documents.map((doc) => ({
    type: 'document' as const,
    source: {
      type: 'content' as const,
      content: [{ type: 'text' as const, text: doc.content }],
    },
    title: doc.source,
    citations: { enabled: true },
  }));

  const response = await client.messages.create({
    model: DRAFT_MODEL,
    max_tokens: input.maxTokens ?? 4096,
    system: input.systemPrompt,
    messages: [
      {
        role: 'user',
        content: [...documentBlocks, { type: 'text', text: input.userMessage }],
      },
    ],
  });

  return collectResult(response, input.documents);
}

function collectResult(
  response: Anthropic.Messages.Message,
  documents: DocumentInput[],
): DrafterResult {
  const citations: CitationSpan[] = [];
  const seenCitation = new Map<string, number>();
  const blocks: DrafterBlock[] = [];
  let text = '';

  for (const block of response.content) {
    if (block.type !== 'text') continue;
    text += block.text;
    const indexes = collectBlockCitations(block, documents, citations, seenCitation);
    blocks.push({ text: block.text, citationIndexes: indexes });
  }

  return {
    text,
    citations,
    blocks,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
  };
}

function collectBlockCitations(
  block: Anthropic.Messages.ContentBlock,
  documents: DocumentInput[],
  citations: CitationSpan[],
  seen: Map<string, number>,
): number[] {
  const raw = (block as { citations?: unknown[] }).citations;
  if (!Array.isArray(raw)) return [];
  const indexes: number[] = [];
  for (const entry of raw) {
    const parsed = parseCitation(entry, documents);
    if (!parsed) continue;
    const key = `${parsed.source}::${parsed.citedText}`;
    let idx = seen.get(key);
    if (idx === undefined) {
      citations.push(parsed);
      idx = citations.length;
      seen.set(key, idx);
    }
    if (!indexes.includes(idx)) indexes.push(idx);
  }
  return indexes;
}

function parseCitation(raw: unknown, documents: DocumentInput[]): CitationSpan | null {
  if (!raw || typeof raw !== 'object') return null;
  const c = raw as { document_index?: unknown; cited_text?: unknown };
  if (typeof c.document_index !== 'number') return null;
  const source = documents[c.document_index]?.source;
  if (!source) return null;
  return {
    source,
    citedText: typeof c.cited_text === 'string' ? c.cited_text : '',
  };
}
