-- Make client_id nullable on inquiries so we can persist email from senders not yet
-- registered as a client. The reviewer can later promote the sender to a client,
-- which fills client_id and re-fires the AI pipeline.
ALTER TABLE "inquiries" ALTER COLUMN "client_id" DROP NOT NULL;

-- Capture the original sender on unmatched inbound rows so the reviewer has enough
-- context to decide whether to register them as a client.
ALTER TABLE "inquiries" ADD COLUMN "unmatched_sender" text;

-- The pre-existing FK was implicitly RESTRICT. Rebuild it to be SET NULL on client
-- delete: when a client row goes away (rare, only if 0 inquiries, but kept for safety)
-- the inquiry stays as an unmatched row rather than failing.
ALTER TABLE "inquiries" DROP CONSTRAINT IF EXISTS "inquiries_client_id_fkey";
ALTER TABLE "inquiries"
  ADD CONSTRAINT "inquiries_client_id_fkey"
  FOREIGN KEY ("client_id") REFERENCES "clients"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
