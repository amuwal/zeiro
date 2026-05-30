// Contract every inbound WEBHOOK channel (LINE, Chatwork, …) implements so the
// regulated pipeline (PII mask → createInquiry → audit → enqueue) lives in ONE
// place (process-inbound.ts) and adding a channel = implement this + a thin route.
//
// Deliberately scoped to webhook channels. Email (/api/inbound) and the web
// contact form are NOT modelled here: email carries attachments + In-Reply-To
// threading + duplicate handling, and the form auto-creates clients — folding
// those into this contract was the over-reach the design review flagged.

export type CanonicalMessage = {
  // Channel-specific sender key the adapter resolves a client by (LINE userId,
  // Chatwork roomId). Opaque to the shared pipeline.
  senderId: string;
  // Globally-unique, channel-prefixed id → the Inquiry idempotency key.
  messageId: string;
  receivedAt: string;
  subject: string;
  // Cleaned text (markup stripped); NOT yet masked — the pipeline masks once.
  body: string;
};

export type ClientRef = { id: string; assignedTaxAccountantId: string | null };

export type WebhookChannelId = 'line' | 'chatwork';

export type ChannelAdapter<Cfg> = {
  id: WebhookChannelId;
  // Zod-parse FirmChannel.config JSONB; null → route returns 500.
  parseConfig(raw: unknown): Cfg | null;
  // Full Headers passed (not one pre-extracted value) so multi-header schemes
  // (Svix, Slack timestamp+sig) fit later without changing the contract.
  verifySignature(args: { rawBody: string; headers: Headers; config: Cfg }): boolean;
  // Normalize payload → canonical messages. Channel quirks (bot-skip, markup
  // strip, non-text filtering) live here. Returns [] when the payload is valid
  // but carries nothing to ingest; THROWS on a malformed payload (route → 400).
  parseEvents(args: { rawBody: string; config: Cfg }): CanonicalMessage[];
  resolveClient(firmId: string, msg: CanonicalMessage): Promise<ClientRef | null>;
  // Channel-specific audit fields merged into the recorded row so no audit
  // detail is lost when the pipeline is shared (e.g. lineUserId / roomId).
  auditMeta(msg: CanonicalMessage): Record<string, unknown>;
};
