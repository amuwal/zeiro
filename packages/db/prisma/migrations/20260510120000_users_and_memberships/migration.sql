CREATE TABLE "users" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "clerk_user_id" TEXT NOT NULL,
  "email" CITEXT NOT NULL,
  "name" TEXT NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "users_clerk_user_id_key" ON "users"("clerk_user_id");

CREATE TABLE "memberships" (
  "user_id" UUID NOT NULL,
  "firm_id" UUID NOT NULL,
  "role" TEXT NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "memberships_pkey" PRIMARY KEY ("user_id", "firm_id")
);
CREATE INDEX "memberships_firm_id_idx" ON "memberships"("firm_id");
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_firm_id_fkey"
  FOREIGN KEY ("firm_id") REFERENCES "firms"("id") ON DELETE CASCADE;

ALTER TABLE "firms" ADD COLUMN "clerk_org_id" TEXT;
CREATE UNIQUE INDEX "firms_clerk_org_id_key" ON "firms"("clerk_org_id");

ALTER TABLE "clients" ADD CONSTRAINT "clients_assigned_user_fkey"
  FOREIGN KEY ("assigned_tax_accountant_id") REFERENCES "users"("id");
