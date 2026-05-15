-- Distinguishes firm-owned knowledge from globally-shared packs (e.g. the
-- default JP tax FAQ provisioned at signup). Global rows have firm_id = NULL
-- and are visible to every firm via the search functions below.
ALTER TABLE "knowledge_chunks"
  ADD COLUMN "scope" TEXT NOT NULL DEFAULT 'firm';

ALTER TABLE "knowledge_chunks"
  ALTER COLUMN "firm_id" DROP NOT NULL;

CREATE INDEX "knowledge_chunks_scope_idx" ON "knowledge_chunks"("scope");

-- Replace the firm-only filters with a union of firm-scoped + global rows.
-- Callers still pass the firm uuid; cross-tenant leakage is impossible because
-- private chunks are always tagged scope='firm' with a non-null firm_id.
CREATE OR REPLACE FUNCTION match_knowledge(
  firm uuid,
  query_embedding vector(1536),
  match_count int
) RETURNS TABLE (
  id uuid,
  source text,
  content text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    k.id,
    k.source,
    k.content,
    1 - (k.embedding <=> query_embedding) AS similarity
  FROM knowledge_chunks k
  WHERE (k.firm_id = firm OR k.scope = 'global')
    AND COALESCE((k.metadata->>'requiresReview')::boolean, false) = false
  ORDER BY k.embedding <=> query_embedding
  LIMIT match_count;
$$;

CREATE OR REPLACE FUNCTION match_knowledge_text(
  firm uuid,
  query_text text,
  match_count int
) RETURNS TABLE (
  id uuid,
  source text,
  content text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    k.id,
    k.source,
    k.content,
    ts_rank_cd(k.content_tsv, plainto_tsquery('simple', query_text)) AS similarity
  FROM knowledge_chunks k
  WHERE (k.firm_id = firm OR k.scope = 'global')
    AND COALESCE((k.metadata->>'requiresReview')::boolean, false) = false
    AND k.content_tsv @@ plainto_tsquery('simple', query_text)
  ORDER BY similarity DESC
  LIMIT match_count;
$$;
