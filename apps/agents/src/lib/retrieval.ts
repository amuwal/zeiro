import {
  RERANK_THRESHOLD,
  RETRIEVAL_BM25_TOP,
  RETRIEVAL_FINAL_TOP,
  RETRIEVAL_FUSE_TOP,
  RETRIEVAL_VECTOR_TOP,
} from '@zeiro/core';
import { type KnowledgeHit, searchKnowledgeBM25, searchKnowledgeVector } from '@zeiro/db';
import { rerank } from './cohere';
import { embedQuery } from './embeddings';

export type RetrievalOptions = {
  topN?: number;
  threshold?: number;
};

export async function hybridSearch(
  firmId: string,
  query: string,
  opts: RetrievalOptions = {},
): Promise<KnowledgeHit[]> {
  const topN = opts.topN ?? RETRIEVAL_FINAL_TOP;
  const threshold = opts.threshold ?? RERANK_THRESHOLD;

  const embedding = await embedQuery(query);
  const [vec, lex] = await Promise.all([
    searchKnowledgeVector(firmId, embedding, RETRIEVAL_VECTOR_TOP),
    searchKnowledgeBM25(firmId, query, RETRIEVAL_BM25_TOP),
  ]);

  if (vec.length === 0 && lex.length === 0) return [];

  const fused = rrfFuse([vec, lex]).slice(0, RETRIEVAL_FUSE_TOP);
  const byId = new Map<string, KnowledgeHit>();
  for (const hit of [...vec, ...lex]) byId.set(hit.id, hit);
  const fusedHits = fused
    .map(({ id }) => byId.get(id))
    .filter((h): h is KnowledgeHit => Boolean(h));

  const apiKey = process.env.COHERE_API_KEY;
  if (!apiKey) return fusedHits.slice(0, topN);

  const reranked = await rerank({
    apiKey,
    query,
    documents: fusedHits.map((h) => h.content),
    topN,
  });

  return reranked
    .filter((r) => r.score >= threshold)
    .map((r) => {
      const hit = fusedHits[r.index];
      return hit ? { ...hit, similarity: r.score } : null;
    })
    .filter((h): h is KnowledgeHit => Boolean(h));
}

function rrfFuse(rankings: KnowledgeHit[][], k = 60): Array<{ id: string; score: number }> {
  const scores = new Map<string, number>();
  for (const ranking of rankings) {
    ranking.forEach((hit, rank) => {
      scores.set(hit.id, (scores.get(hit.id) ?? 0) + 1 / (k + rank + 1));
    });
  }
  return Array.from(scores.entries())
    .map(([id, score]) => ({ id, score }))
    .sort((a, b) => b.score - a.score);
}
