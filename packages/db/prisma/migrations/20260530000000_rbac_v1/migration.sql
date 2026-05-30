-- RBAC v1: appRole authz axis, per-user send/scope, drafts tenant denormalization,
-- and per-client 担当者 assignment.

-- 1. Membership authorization columns -------------------------------------------------
ALTER TABLE "memberships" ADD COLUMN "app_role" TEXT NOT NULL DEFAULT 'staff';
ALTER TABLE "memberships" ADD COLUMN "can_send" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "memberships" ADD COLUMN "client_scope" TEXT NOT NULL DEFAULT 'assigned';

-- Existing Clerk admins become owners with full reach. Any pre-existing non-admin
-- members were already operating with full access, so promote them to reviewer
-- (can send, sees all) rather than silently locking them out.
UPDATE "memberships"
  SET "app_role" = 'owner', "can_send" = true, "client_scope" = 'all'
  WHERE lower("role") LIKE '%admin%';
UPDATE "memberships"
  SET "app_role" = 'reviewer', "can_send" = true, "client_scope" = 'all'
  WHERE lower("role") NOT LIKE '%admin%';

CREATE INDEX "memberships_firm_id_app_role_idx" ON "memberships" ("firm_id", "app_role");

-- 2. Denormalize firm_id onto drafts (tenant-safe draft queries; closes the
--    getDraftByInquiry / findDraftBy*MessageId isolation gap) ------------------------
ALTER TABLE "drafts" ADD COLUMN "firm_id" UUID;
UPDATE "drafts" d SET "firm_id" = i."firm_id"
  FROM "inquiries" i WHERE d."inquiry_id" = i."id";
ALTER TABLE "drafts" ALTER COLUMN "firm_id" SET NOT NULL;
ALTER TABLE "drafts"
  ADD CONSTRAINT "drafts_firm_id_fkey" FOREIGN KEY ("firm_id")
  REFERENCES "firms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "drafts_firm_id_idx" ON "drafts" ("firm_id");

-- 3. Per-client 担当者 assignment ------------------------------------------------------
CREATE TABLE "client_assignees" (
  "id"         UUID NOT NULL DEFAULT gen_random_uuid(),
  "firm_id"    UUID NOT NULL,
  "client_id"  UUID NOT NULL,
  "user_id"    UUID NOT NULL,
  "role"       TEXT NOT NULL DEFAULT 'primary',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "client_assignees_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "client_assignees_client_id_user_id_key"
  ON "client_assignees" ("client_id", "user_id");
CREATE INDEX "client_assignees_firm_id_idx" ON "client_assignees" ("firm_id");
CREATE INDEX "client_assignees_user_id_idx" ON "client_assignees" ("user_id");
CREATE INDEX "client_assignees_firm_id_user_id_idx" ON "client_assignees" ("firm_id", "user_id");
ALTER TABLE "client_assignees"
  ADD CONSTRAINT "client_assignees_firm_id_fkey" FOREIGN KEY ("firm_id")
  REFERENCES "firms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "client_assignees"
  ADD CONSTRAINT "client_assignees_client_id_fkey" FOREIGN KEY ("client_id")
  REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "client_assignees"
  ADD CONSTRAINT "client_assignees_user_id_fkey" FOREIGN KEY ("user_id")
  REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill from the existing primary pointer.
INSERT INTO "client_assignees" ("firm_id", "client_id", "user_id", "role")
  SELECT "firm_id", "id", "assigned_tax_accountant_id", 'primary'
  FROM "clients"
  WHERE "assigned_tax_accountant_id" IS NOT NULL
  ON CONFLICT DO NOTHING;
