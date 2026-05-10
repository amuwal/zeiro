CREATE EXTENSION IF NOT EXISTS "citext";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

CREATE TABLE "firms" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "inbound_address" CITEXT NOT NULL,
  "region" TEXT NOT NULL,
  "settings" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "firms_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "firms_inbound_address_key" ON "firms"("inbound_address");

CREATE TABLE "clients" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "firm_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "primary_email" CITEXT NOT NULL,
  "contract_type" TEXT NOT NULL,
  "assigned_tax_accountant_id" UUID,
  "notes" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "clients_firm_id_primary_email_key" ON "clients"("firm_id","primary_email");
ALTER TABLE "clients" ADD CONSTRAINT "clients_firm_id_fkey"
  FOREIGN KEY ("firm_id") REFERENCES "firms"("id") ON DELETE CASCADE;

CREATE TABLE "inquiries" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "firm_id" UUID NOT NULL,
  "client_id" UUID NOT NULL,
  "message_id" TEXT NOT NULL,
  "received_at" TIMESTAMPTZ(6) NOT NULL,
  "subject" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "analysis" JSONB NOT NULL DEFAULT '{}',
  CONSTRAINT "inquiries_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "inquiries_firm_id_message_id_key" ON "inquiries"("firm_id","message_id");
CREATE INDEX "inquiries_firm_id_received_at_idx"
  ON "inquiries"("firm_id","received_at" DESC);
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_firm_id_fkey"
  FOREIGN KEY ("firm_id") REFERENCES "firms"("id") ON DELETE CASCADE;
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_client_id_fkey"
  FOREIGN KEY ("client_id") REFERENCES "clients"("id");

CREATE TABLE "drafts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "inquiry_id" UUID NOT NULL,
  "subject" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "citations" JSONB NOT NULL DEFAULT '[]',
  "confidence" DOUBLE PRECISION NOT NULL,
  "model" TEXT NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "drafts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "drafts_inquiry_id_created_at_idx"
  ON "drafts"("inquiry_id","created_at" DESC);
ALTER TABLE "drafts" ADD CONSTRAINT "drafts_inquiry_id_fkey"
  FOREIGN KEY ("inquiry_id") REFERENCES "inquiries"("id") ON DELETE CASCADE;

CREATE TABLE "audit_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "firm_id" UUID NOT NULL,
  "actor_id" UUID NOT NULL,
  "inquiry_id" UUID,
  "action" TEXT NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "audit_events_firm_id_created_at_idx"
  ON "audit_events"("firm_id","created_at" DESC);
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_firm_id_fkey"
  FOREIGN KEY ("firm_id") REFERENCES "firms"("id");
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_inquiry_id_fkey"
  FOREIGN KEY ("inquiry_id") REFERENCES "inquiries"("id");

CREATE TABLE "knowledge_chunks" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "firm_id" UUID NOT NULL,
  "source" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "embedding" vector(1536) NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  CONSTRAINT "knowledge_chunks_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "knowledge_chunks_firm_id_idx" ON "knowledge_chunks"("firm_id");
CREATE INDEX "knowledge_chunks_embedding_idx"
  ON "knowledge_chunks" USING ivfflat (embedding vector_cosine_ops);
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_firm_id_fkey"
  FOREIGN KEY ("firm_id") REFERENCES "firms"("id") ON DELETE CASCADE;
