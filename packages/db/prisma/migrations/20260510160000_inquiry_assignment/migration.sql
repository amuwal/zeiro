ALTER TABLE "inquiries" ADD COLUMN "assigned_to_id" UUID;

ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_assigned_to_id_fkey"
  FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL;

CREATE INDEX "inquiries_firm_id_assigned_to_id_idx"
  ON "inquiries"("firm_id", "assigned_to_id");
