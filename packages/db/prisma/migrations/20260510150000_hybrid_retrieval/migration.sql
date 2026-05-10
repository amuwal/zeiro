ALTER TABLE "knowledge_chunks"
  ADD COLUMN "content_tsv" tsvector
  GENERATED ALWAYS AS (to_tsvector('simple', content)) STORED;

CREATE INDEX "knowledge_chunks_content_tsv_idx"
  ON "knowledge_chunks" USING gin (content_tsv);

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
  WHERE k.firm_id = firm
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
  WHERE k.firm_id = firm
    AND COALESCE((k.metadata->>'requiresReview')::boolean, false) = false
    AND k.content_tsv @@ plainto_tsquery('simple', query_text)
  ORDER BY similarity DESC
  LIMIT match_count;
$$;
