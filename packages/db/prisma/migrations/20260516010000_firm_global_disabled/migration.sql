-- Per-firm opt-out for individual global knowledge sources. Existence of a row
-- means "this firm has disabled this source". Default state is fully enabled,
-- so an empty table reproduces the original behaviour. Key is (firm_id, source)
-- rather than (firm_id, chunk_id) so reseeding the pack with new embeddings
-- preserves a firm's disabled selections.
CREATE TABLE "firm_global_disabled" (
  "firm_id" UUID NOT NULL,
  "source" TEXT NOT NULL,
  "disabled_by" UUID NOT NULL,
  "disabled_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "firm_global_disabled_pkey" PRIMARY KEY ("firm_id", "source"),
  CONSTRAINT "firm_global_disabled_firm_id_fkey"
    FOREIGN KEY ("firm_id") REFERENCES "firms"("id") ON DELETE CASCADE
);

CREATE INDEX "firm_global_disabled_firm_id_idx"
  ON "firm_global_disabled"("firm_id");

-- Refresh the helper functions to honour the disabled set. Cross-tenant safety
-- is unchanged: a firm sees its own private chunks plus global rows it has not
-- disabled. Subquery on the small `firm_global_disabled` table is cheap thanks
-- to the (firm_id, source) primary key.
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
    AND NOT (
      k.scope = 'global'
      AND k.source IN (SELECT source FROM firm_global_disabled WHERE firm_id = firm)
    )
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
    AND NOT (
      k.scope = 'global'
      AND k.source IN (SELECT source FROM firm_global_disabled WHERE firm_id = firm)
    )
  ORDER BY similarity DESC
  LIMIT match_count;
$$;
