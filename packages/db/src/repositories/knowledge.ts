import type { KnowledgeChunk, Prisma } from '@prisma/client';
import { getPrisma } from '../server';

export type KnowledgeHit = {
  id: string;
  source: string;
  content: string;
  similarity: number;
};

// Both search functions union the requesting firm's private chunks with any
// rows tagged scope='global' (shared packs like the default JP tax FAQ),
// minus any global sources the firm has explicitly disabled. The firmId is
// still required — `scope = 'global'` only widens access to chunks that have
// no owning firm, never to another firm's private data.

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
    WHERE (firm_id = ${firmId}::uuid OR scope = 'global')
      AND COALESCE((metadata->>'requiresReview')::boolean, false) = false
      AND NOT (
        scope = 'global'
        AND source IN (
          SELECT source FROM firm_global_disabled WHERE firm_id = ${firmId}::uuid
        )
      )
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
    WHERE (firm_id = ${firmId}::uuid OR scope = 'global')
      AND COALESCE((metadata->>'requiresReview')::boolean, false) = false
      AND content_tsv @@ plainto_tsquery('simple', ${query})
      AND NOT (
        scope = 'global'
        AND source IN (
          SELECT source FROM firm_global_disabled WHERE firm_id = ${firmId}::uuid
        )
      )
    ORDER BY similarity DESC
    LIMIT ${topK}
  `;
}

/** @deprecated use searchKnowledgeVector */
export const searchKnowledge = searchKnowledgeVector;

export type KnowledgeListItem = Omit<KnowledgeChunk, 'embedding'>;

export function listKnowledgeChunks(firmId: string): Promise<KnowledgeListItem[]> {
  return getPrisma().knowledgeChunk.findMany({
    where: { firmId, scope: 'firm' },
    select: { id: true, firmId: true, scope: true, source: true, content: true, metadata: true },
    orderBy: { source: 'asc' },
  });
}

export function listGlobalKnowledgeChunks(): Promise<KnowledgeListItem[]> {
  return getPrisma().knowledgeChunk.findMany({
    where: { scope: 'global' },
    select: { id: true, firmId: true, scope: true, source: true, content: true, metadata: true },
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
    INSERT INTO knowledge_chunks (firm_id, scope, source, content, embedding, metadata)
    VALUES (
      ${input.firmId}::uuid,
      'firm',
      ${input.source},
      ${input.content},
      ${vector}::vector,
      ${metadata}::jsonb
    )
  `;
}

type GlobalChunkInsert = {
  source: string;
  content: string;
  embedding: number[];
  metadata?: Record<string, unknown>;
};

// Inserts a row that's visible to every firm. Reserved for curated default
// packs (e.g. JP tax FAQ) and must not be called from any per-tenant code
// path. The accompanying `deleteGlobalKnowledgeBySource` keeps reseeding
// idempotent.
export async function insertGlobalKnowledgeChunk(input: GlobalChunkInsert): Promise<void> {
  const vector = `[${input.embedding.join(',')}]`;
  const metadata = JSON.stringify(input.metadata ?? {});
  await getPrisma().$executeRaw`
    INSERT INTO knowledge_chunks (firm_id, scope, source, content, embedding, metadata)
    VALUES (
      NULL,
      'global',
      ${input.source},
      ${input.content},
      ${vector}::vector,
      ${metadata}::jsonb
    )
  `;
}

export async function deleteGlobalKnowledgeBySource(source: string): Promise<number> {
  const result = await getPrisma().knowledgeChunk.deleteMany({
    where: { scope: 'global', source },
  });
  return result.count;
}

// Listing for the firm-side knowledge page: every global source the system
// ships, plus whether this firm has disabled it. Returned in source order so
// the UI can group by pack prefix without re-sorting.
export type GlobalSourceListing = {
  id: string;
  source: string;
  content: string;
  metadata: Record<string, unknown>;
  disabled: boolean;
};

export async function listGlobalSourcesForFirm(firmId: string): Promise<GlobalSourceListing[]> {
  type Row = GlobalSourceListing;
  return getPrisma().$queryRaw<Row[]>`
    SELECT
      k.id,
      k.source,
      k.content,
      k.metadata,
      (d.source IS NOT NULL) AS disabled
    FROM knowledge_chunks k
    LEFT JOIN firm_global_disabled d
      ON d.firm_id = ${firmId}::uuid AND d.source = k.source
    WHERE k.scope = 'global'
    ORDER BY k.source ASC
  `;
}

export async function listFirmDisabledGlobalSources(firmId: string): Promise<string[]> {
  const rows = await getPrisma().firmGlobalDisabled.findMany({
    where: { firmId },
    select: { source: true },
    orderBy: { source: 'asc' },
  });
  return rows.map((r) => r.source);
}

type ToggleInput = {
  firmId: string;
  source: string;
  actorId: string;
};

// Idempotent: re-disabling an already-disabled source is a no-op so multi-tab
// double-submits don't surface as errors. Returns whether the row was created.
export async function disableGlobalSource(input: ToggleInput): Promise<boolean> {
  try {
    await getPrisma().firmGlobalDisabled.create({
      data: {
        firmId: input.firmId,
        source: input.source,
        disabledBy: input.actorId,
      },
    });
    return true;
  } catch (e) {
    if (isPrismaUniqueViolation(e)) return false;
    throw e;
  }
}

export async function enableGlobalSource(input: ToggleInput): Promise<boolean> {
  const result = await getPrisma().firmGlobalDisabled.deleteMany({
    where: { firmId: input.firmId, source: input.source },
  });
  return result.count > 0;
}

// Atomic master toggle for the global pack. `disabled=true` inserts a row for
// every global source the firm hasn't already disabled; `disabled=false`
// clears the firm's disabled set entirely. Returned count is the number of
// rows actually changed (skipping no-ops), which the UI shows as confirmation.
export async function bulkSetGlobalSourcesDisabled(input: {
  firmId: string;
  actorId: string;
  disabled: boolean;
}): Promise<number> {
  const prisma = getPrisma();
  if (input.disabled) {
    const globals = await prisma.knowledgeChunk.findMany({
      where: { scope: 'global' },
      select: { source: true },
      distinct: ['source'],
    });
    const result = await prisma.firmGlobalDisabled.createMany({
      data: globals.map((g) => ({
        firmId: input.firmId,
        source: g.source,
        disabledBy: input.actorId,
      })),
      skipDuplicates: true,
    });
    return result.count;
  }
  const result = await prisma.firmGlobalDisabled.deleteMany({
    where: { firmId: input.firmId },
  });
  return result.count;
}

// Fetch a single chunk for the firm. Returns the row if it belongs to the firm
// (scope='firm') or is part of the shared global pack. Returns null otherwise
// — used to drive detail pages that should 404 on stranger chunk IDs.
export async function getChunkForFirm(
  firmId: string,
  chunkId: string,
): Promise<KnowledgeListItem | null> {
  const row = await getPrisma().knowledgeChunk.findFirst({
    where: {
      id: chunkId,
      OR: [{ firmId, scope: 'firm' }, { scope: 'global' }],
    },
    select: { id: true, firmId: true, scope: true, source: true, content: true, metadata: true },
  });
  return row;
}

// All chunks belonging to one firm-uploaded document. Looks up by
// metadata.documentId, with a fallback to matching `source` so legacy chunks
// ingested before documentId tagging (fixtures, early seeds) still resolve.
export async function listFirmChunksByDocument(
  firmId: string,
  documentId: string,
): Promise<KnowledgeListItem[]> {
  return getPrisma().$queryRaw<KnowledgeListItem[]>`
    SELECT id, firm_id AS "firmId", scope, source, content, metadata
    FROM knowledge_chunks
    WHERE firm_id = ${firmId}::uuid
      AND scope = 'firm'
      AND (metadata->>'documentId' = ${documentId} OR source = ${documentId})
    ORDER BY COALESCE((metadata->>'chunkIdx')::int, 0) ASC
  `;
}

// One row per firm document (grouped by documentId, or by source for legacy
// rows without one). Includes chunk count and the most recent ingest timestamp
// so the library page can sort by recency and surface document-level metadata.
export type FirmDocumentSummary = {
  documentId: string;
  source: string;
  chunks: number;
  latestIngestedAt: string | null;
  flagged: boolean;
};

export async function listFirmDocuments(firmId: string): Promise<FirmDocumentSummary[]> {
  type Row = {
    documentId: string;
    source: string;
    chunks: bigint;
    latestIngestedAt: string | null;
    flagged: boolean;
  };
  const rows = await getPrisma().$queryRaw<Row[]>`
    SELECT
      COALESCE(metadata->>'documentId', source) AS "documentId",
      MIN(source) AS source,
      COUNT(*) AS chunks,
      MAX(metadata->>'ingestedAt') AS "latestIngestedAt",
      BOOL_OR(COALESCE((metadata->>'requiresReview')::boolean, false)) AS flagged
    FROM knowledge_chunks
    WHERE firm_id = ${firmId}::uuid AND scope = 'firm'
    GROUP BY COALESCE(metadata->>'documentId', source)
    ORDER BY MAX(metadata->>'ingestedAt') DESC NULLS LAST, MIN(source) ASC
  `;
  return rows.map((r) => ({
    documentId: r.documentId,
    source: r.source,
    chunks: Number(r.chunks),
    latestIngestedAt: r.latestIngestedAt,
    flagged: r.flagged,
  }));
}

function isPrismaUniqueViolation(e: unknown): boolean {
  return (
    typeof e === 'object' && e !== null && 'code' in e && (e as { code: unknown }).code === 'P2002'
  );
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
  const flagged = {
    ...existing,
    requiresReview: true,
    reviewReason: input.reason,
    reviewFlaggedAt: new Date().toISOString(),
    reviewFlaggedBy: input.flaggedBy,
  } as Prisma.InputJsonValue;
  await getPrisma().knowledgeChunk.update({
    where: { id: chunk.id },
    data: { metadata: flagged },
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
  const cleared = {
    ...existing,
    requiresReview: false,
    reviewClearedAt: new Date().toISOString(),
    reviewClearedBy: input.clearedBy,
  } as Prisma.InputJsonValue;
  await getPrisma().knowledgeChunk.update({
    where: { id: chunk.id },
    data: { metadata: cleared },
  });
  return true;
}

function readMeta(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
