import type { KnowledgeChunk } from '@prisma/client';
import { getPrisma } from '../server';

export type KnowledgeHit = {
  id: string;
  source: string;
  content: string;
  similarity: number;
};

export async function searchKnowledgeVector(
  firmId: string,
  embedding: number[],
  topK: number,
): Promise<KnowledgeHit[]> {
  const vector = `[${embedding.join(',')}]`;
  return getPrisma().$queryRaw<KnowledgeHit[]>`
    SELECT id, source, content,
           1 - (embedding <=> ${vector}::vector) AS similarity
    FROM knowledge_chunks
    WHERE firm_id = ${firmId}::uuid
      AND COALESCE((metadata->>'requiresReview')::boolean, false) = false
    ORDER BY embedding <=> ${vector}::vector
    LIMIT ${topK}
  `;
}

export async function searchKnowledgeBM25(
  firmId: string,
  query: string,
  topK: number,
): Promise<KnowledgeHit[]> {
  if (!query.trim()) return [];
  return getPrisma().$queryRaw<KnowledgeHit[]>`
    SELECT id, source, content,
           ts_rank_cd(content_tsv, plainto_tsquery('simple', ${query})) AS similarity
    FROM knowledge_chunks
    WHERE firm_id = ${firmId}::uuid
      AND COALESCE((metadata->>'requiresReview')::boolean, false) = false
      AND content_tsv @@ plainto_tsquery('simple', ${query})
    ORDER BY similarity DESC
    LIMIT ${topK}
  `;
}

/** @deprecated use searchKnowledgeVector */
export const searchKnowledge = searchKnowledgeVector;

export type KnowledgeListItem = Omit<KnowledgeChunk, 'embedding'>;

export function listKnowledgeChunks(firmId: string): Promise<KnowledgeListItem[]> {
  return getPrisma().knowledgeChunk.findMany({
    where: { firmId },
    select: { id: true, firmId: true, source: true, content: true, metadata: true },
    orderBy: { source: 'asc' },
  });
}

type ChunkInsert = {
  firmId: string;
  source: string;
  content: string;
  embedding: number[];
  metadata?: Record<string, unknown>;
};

export async function insertKnowledgeChunk(input: ChunkInsert): Promise<void> {
  const vector = `[${input.embedding.join(',')}]`;
  const metadata = JSON.stringify(input.metadata ?? {});
  await getPrisma().$executeRaw`
    INSERT INTO knowledge_chunks (firm_id, source, content, embedding, metadata)
    VALUES (
      ${input.firmId}::uuid,
      ${input.source},
      ${input.content},
      ${vector}::vector,
      ${metadata}::jsonb
    )
  `;
}
