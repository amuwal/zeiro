-- Async ingestion queue. Each row tracks one user-uploaded knowledge file
-- from form submission → background worker → final ingest. The raw bytes
-- ride on the row so the worker can pick them up from any process; the
-- worker clears `bytes` after a successful run to keep the table small.
CREATE TABLE "knowledge_ingestion_jobs" (
  "id"            UUID         NOT NULL DEFAULT gen_random_uuid(),
  "firm_id"       UUID         NOT NULL,
  "actor_id"      UUID         NOT NULL,
  "source"        TEXT         NOT NULL,
  "filename"      TEXT         NOT NULL,
  "mimetype"      TEXT,
  "bytes"         BYTEA,
  "status"        TEXT         NOT NULL DEFAULT 'pending',
  "chunk_count"   INTEGER,
  "error_code"    TEXT,
  "error_message" TEXT,
  "metadata"      JSONB        NOT NULL DEFAULT '{}',
  "created_at"    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  "started_at"    TIMESTAMPTZ,
  "completed_at"  TIMESTAMPTZ,
  CONSTRAINT "knowledge_ingestion_jobs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "knowledge_ingestion_jobs_firm_id_fkey"
    FOREIGN KEY ("firm_id") REFERENCES "firms"("id") ON DELETE CASCADE
);

CREATE INDEX "knowledge_ingestion_jobs_firm_id_created_at_idx"
  ON "knowledge_ingestion_jobs"("firm_id", "created_at" DESC);

CREATE INDEX "knowledge_ingestion_jobs_status_idx"
  ON "knowledge_ingestion_jobs"("status");
