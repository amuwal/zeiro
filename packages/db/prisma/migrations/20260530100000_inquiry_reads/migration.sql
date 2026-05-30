-- Per-user read state for inquiries (WhatsApp/email-style "seen"). A leaf
-- inquiry is "unread" for a user until they open it; a new reply creates a new
-- leaf, which is unread again.
CREATE TABLE "inquiry_reads" (
  "id"         UUID NOT NULL DEFAULT gen_random_uuid(),
  "firm_id"    UUID NOT NULL,
  "inquiry_id" UUID NOT NULL,
  "user_id"    UUID NOT NULL,
  "read_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "inquiry_reads_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "inquiry_reads_inquiry_id_user_id_key" ON "inquiry_reads" ("inquiry_id", "user_id");
CREATE INDEX "inquiry_reads_firm_id_user_id_idx" ON "inquiry_reads" ("firm_id", "user_id");
ALTER TABLE "inquiry_reads"
  ADD CONSTRAINT "inquiry_reads_firm_id_fkey" FOREIGN KEY ("firm_id")
  REFERENCES "firms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inquiry_reads"
  ADD CONSTRAINT "inquiry_reads_inquiry_id_fkey" FOREIGN KEY ("inquiry_id")
  REFERENCES "inquiries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inquiry_reads"
  ADD CONSTRAINT "inquiry_reads_user_id_fkey" FOREIGN KEY ("user_id")
  REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
