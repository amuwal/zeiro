ALTER TABLE "inquiries" ADD COLUMN "parent_inquiry_id" UUID;

ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_parent_inquiry_id_fkey"
  FOREIGN KEY ("parent_inquiry_id") REFERENCES "inquiries"("id") ON DELETE SET NULL;

CREATE INDEX "inquiries_parent_inquiry_id_idx"
  ON "inquiries"("parent_inquiry_id");
