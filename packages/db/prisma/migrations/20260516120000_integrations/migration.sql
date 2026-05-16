-- Firm-level OAuth state for third-party integrations (freee for now,
-- MoneyForward / 弥生 planned). One row per (firm, provider).
-- Tokens are AES-256-GCM encrypted at the app layer; the DB never sees plaintext.
CREATE TABLE "integrations" (
  "id"                UUID         NOT NULL DEFAULT gen_random_uuid(),
  "firm_id"           UUID         NOT NULL,
  "provider"          TEXT         NOT NULL,
  "access_token"      TEXT         NOT NULL,
  "refresh_token"     TEXT,
  "token_type"        TEXT         NOT NULL DEFAULT 'Bearer',
  "scope"             TEXT,
  "expires_at"        TIMESTAMPTZ,
  "status"            TEXT         NOT NULL DEFAULT 'active',
  "last_refreshed_at" TIMESTAMPTZ,
  "last_error"        TEXT,
  "metadata"          JSONB        NOT NULL DEFAULT '{}'::jsonb,
  "created_at"        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  "updated_at"        TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT "integrations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "integrations_firm_id_provider_key" ON "integrations"("firm_id", "provider");
CREATE INDEX "integrations_status_expires_at_idx" ON "integrations"("status", "expires_at");

ALTER TABLE "integrations"
  ADD CONSTRAINT "integrations_firm_id_fkey"
  FOREIGN KEY ("firm_id") REFERENCES "firms"("id")
  ON DELETE CASCADE;

-- Per-client mapping: which external entity (e.g. freee 事業所) is this
-- zeiro client. One binding per (client, integration) — a client can't be
-- bound to multiple 事業所 of the same provider.
CREATE TABLE "client_integration_bindings" (
  "id"             UUID        NOT NULL DEFAULT gen_random_uuid(),
  "integration_id" UUID        NOT NULL,
  "client_id"      UUID        NOT NULL,
  "external_id"    TEXT        NOT NULL,
  "external_name"  TEXT,
  "created_at"     TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT "client_integration_bindings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "client_integration_bindings_client_id_integration_id_key"
  ON "client_integration_bindings"("client_id", "integration_id");
CREATE INDEX "client_integration_bindings_integration_id_idx"
  ON "client_integration_bindings"("integration_id");

ALTER TABLE "client_integration_bindings"
  ADD CONSTRAINT "client_integration_bindings_integration_id_fkey"
  FOREIGN KEY ("integration_id") REFERENCES "integrations"("id")
  ON DELETE CASCADE;

ALTER TABLE "client_integration_bindings"
  ADD CONSTRAINT "client_integration_bindings_client_id_fkey"
  FOREIGN KEY ("client_id") REFERENCES "clients"("id")
  ON DELETE CASCADE;

-- updated_at trigger for integrations
CREATE OR REPLACE FUNCTION set_integrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER integrations_updated_at_trigger
  BEFORE UPDATE ON "integrations"
  FOR EACH ROW
  EXECUTE FUNCTION set_integrations_updated_at();
