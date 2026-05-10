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

type FlagInput = {
  firmId: string;
  chunkId: string;
  reason: string;
  flaggedBy: string;
};

export async function flagKnowledgeChunk(input: FlagInput): Promise<boolean> {
  const chunk = await getPrisma().knowledgeChunk.findFirst({
    where: { id: input.chunkId, firmId: input.firmId },
    select: { id: true, metadata: true },
  });
  if (!chunk) return false;
  const existing = readMeta(chunk.metadata);
  await getPrisma().knowledgeChunk.update({
    where: { id: chunk.id },
    data: {
      metadata: {
        ...existing,
        requiresReview: true,
        reviewReason: input.reason,
        reviewFlaggedAt: new Date().toISOString(),
        reviewFlaggedBy: input.flaggedBy,
      } as Record<string, unknown>,
    },
  });
  return true;
}

type UnflagInput = {
  firmId: string;
  chunkId: string;
  clearedBy: string;
};

export async function unflagKnowledgeChunk(input: UnflagInput): Promise<boolean> {
  const chunk = await getPrisma().knowledgeChunk.findFirst({
    where: { id: input.chunkId, firmId: input.firmId },
    select: { id: true, metadata: true },
  });
  if (!chunk) return false;
  const existing = readMeta(chunk.metadata);
  await getPrisma().knowledgeChunk.update({
    where: { id: chunk.id },
    data: {
      metadata: {
        ...existing,
        requiresReview: false,
        reviewClearedAt: new Date().toISOString(),
        reviewClearedBy: input.clearedBy,
      } as Record<string, unknown>,
    },
  });
  return true;
}

function readMeta(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
