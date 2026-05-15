-- Async client-import jobs. Two-phase: a worker reads the bytes and produces
-- a structured preview the user reviews and confirms; only on confirm do we
-- materialise rows in `clients`. `bytes` is cleared once parsing finishes
-- (preview/failed) to keep the table small.
CREATE TABLE "client_imports" (
  "id"             UUID         NOT NULL DEFAULT gen_random_uuid(),
  "firm_id"        UUID         NOT NULL,
  "actor_id"       UUID         NOT NULL,
  "filename"       TEXT         NOT NULL,
  "mimetype"       TEXT,
  "bytes"          BYTEA,
  "status"         TEXT         NOT NULL DEFAULT 'pending',
  "raw_row_count"  INTEGER,
  "parsed"         JSONB,
  "imported_count" INTEGER,
  "skipped_count"  INTEGER,
  "error_code"     TEXT,
  "error_message"  TEXT,
  "metadata"       JSONB        NOT NULL DEFAULT '{}',
  "created_at"     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  "started_at"     TIMESTAMPTZ,
  "parsed_at"      TIMESTAMPTZ,
  "completed_at"   TIMESTAMPTZ,
  CONSTRAINT "client_imports_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "client_imports_firm_id_fkey"
    FOREIGN KEY ("firm_id") REFERENCES "firms"("id") ON DELETE CASCADE
);

CREATE INDEX "client_imports_firm_id_created_at_idx"
  ON "client_imports"("firm_id", "created_at" DESC);

CREATE INDEX "client_imports_status_idx"
  ON "client_imports"("status");
