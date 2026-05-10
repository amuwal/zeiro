CREATE TABLE "firm_channels" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "firm_id" UUID NOT NULL,
  "channel_type" TEXT NOT NULL,
  "config" JSONB NOT NULL DEFAULT '{}',
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "firm_channels_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "firm_channels_firm_id_channel_type_key"
  ON "firm_channels"("firm_id", "channel_type");
ALTER TABLE "firm_channels" ADD CONSTRAINT "firm_channels_firm_id_fkey"
  FOREIGN KEY ("firm_id") REFERENCES "firms"("id") ON DELETE CASCADE;

ALTER TABLE "clients" ADD COLUMN "line_user_id" TEXT;
CREATE UNIQUE INDEX "clients_firm_id_line_user_id_key"
  ON "clients"("firm_id", "line_user_id");

ALTER TABLE "inquiries" ADD COLUMN "channel" TEXT NOT NULL DEFAULT 'email';
CREATE INDEX "inquiries_firm_id_channel_idx"
  ON "inquiries"("firm_id", "channel");
