import { RERANK_MODEL } from '@zeiro/core';

export type RerankResult = { index: number; score: number };

type RerankInput = {
  apiKey: string;
  query: string;
  documents: string[];
  topN: number;
  model?: string;
};

const COHERE_RERANK_URL = 'https://api.cohere.com/v2/rerank';

export async function rerank(input: RerankInput): Promise<RerankResult[]> {
  if (input.documents.length === 0) return [];

  const response = await fetch(COHERE_RERANK_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: input.model ?? RERANK_MODEL,
      query: input.query,
      documents: input.documents,
      top_n: Math.min(input.topN, input.documents.length),
    }),
  });

  if (!response.ok) {
    throw new Error(`Cohere rerank ${response.status}: ${await response.text()}`);
  }

  const data: unknown = await response.json();
  if (
    !data ||
    typeof data !== 'object' ||
    !('results' in data) ||
    !Array.isArray((data as { results: unknown }).results)
  ) {
    throw new Error('Cohere rerank: unexpected response shape');
  }

  type RawResult = { index: number; relevance_score: number };
  const results = (data as { results: RawResult[] }).results;
  return results.map((r) => ({ index: r.index, score: r.relevance_score }));
}
