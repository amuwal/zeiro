-- Two-axis membership model:
--
-- `role`  mirrors Clerk's org role ("org:admin" | "org:member"); kept in
--         sync by the webhook so Clerk remains the source of truth for org
--         membership and billing-level admin.
-- `tier`  is the in-app workflow hierarchy: admin > senior > member.
--         Initialised from `role` (Clerk admin → tier=admin) but can be
--         promoted to `senior` via the app's settings UI without touching
--         Clerk. Clerk demotion (admin → member) cascades to tier=member
--         unless the app has explicitly set tier=senior since.
--
-- `supervisor_id` is the escalation edge — when a draft is escalated by
-- the assignee, the system walks one step up this chain.
ALTER TABLE "memberships"
  ADD COLUMN "tier" TEXT NOT NULL DEFAULT 'member';

UPDATE "memberships" SET "tier" = 'admin' WHERE LOWER("role") LIKE '%admin%';

ALTER TABLE "memberships"
  ADD COLUMN "supervisor_id" UUID;

ALTER TABLE "memberships"
  ADD CONSTRAINT "memberships_supervisor_id_fkey"
    FOREIGN KEY ("supervisor_id") REFERENCES "users"("id") ON DELETE SET NULL;

CREATE INDEX "memberships_supervisor_id_idx"
  ON "memberships"("supervisor_id");

CREATE INDEX "memberships_firm_id_tier_idx"
  ON "memberships"("firm_id", "tier");
