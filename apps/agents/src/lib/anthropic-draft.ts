import Anthropic from '@anthropic-ai/sdk';
import { DRAFT_MODEL } from '@zeiro/core';

export type DocumentInput = {
  source: string;
  content: string;
};

export type CitationSpan = {
  documentIndex: number;
  source: string;
  citedText: string;
};

export type DrafterResult = {
  text: string;
  citations: CitationSpan[];
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
  let text = '';
  const citations: CitationSpan[] = [];

  for (const block of response.content) {
    if (block.type !== 'text') continue;
    text += block.text;
    const blockCites = (block as { citations?: unknown[] }).citations;
    if (!Array.isArray(blockCites)) continue;
    for (const cite of blockCites) {
      const parsed = parseCitation(cite, documents);
      if (parsed) citations.push(parsed);
    }
  }

  return {
    text,
    citations,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
  };
}

function parseCitation(raw: unknown, documents: DocumentInput[]): CitationSpan | null {
  if (!raw || typeof raw !== 'object') return null;
  const c = raw as { document_index?: unknown; cited_text?: unknown };
  if (typeof c.document_index !== 'number') return null;
  const source = documents[c.document_index]?.source ?? '';
  return {
    documentIndex: c.document_index,
    source,
    citedText: typeof c.cited_text === 'string' ? c.cited_text : '',
  };
}
