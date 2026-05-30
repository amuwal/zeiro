-- Chatwork channel: each 顧問先 maps to one Chatwork room (mirrors line_user_id).
ALTER TABLE "clients" ADD COLUMN "chatwork_room_id" TEXT;
CREATE UNIQUE INDEX "clients_firm_id_chatwork_room_id_key" ON "clients" ("firm_id", "chatwork_room_id");
