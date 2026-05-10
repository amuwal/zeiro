# Zeiro — Architecture & Feature Roadmap

A planning document. Synthesised from current codebase state + 2025-26 research on production patterns.

> **Status: decisions resolved (2026-05-10).** Optimised for "no third-party verification waits" — every chosen vendor allows same-day signup. Compliance-strict alternatives (AWS SES Tokyo, Logto self-host, Langfuse self-host) are queued as **Phase-2 tightening** once pilot is live and we can absorb the verification windows.
>
> See **§7 Resolved decisions** for what we picked and why.

---

## 1. Where we are

**Built and runnable today**
- Monorepo: Next.js 16 (web), Mastra 1.8 (agents), Prisma 6 + Neon, Docker-pgvector for dev.
- All 3 design screens (inbox, knowledge, analytics) wired against Prisma reads.
- End-to-end stub pipeline: SendGrid Inbound → tenant-lookup → PII mask → triage agent → escalation rule → draft agent → persist + audit.
- Server actions for send / reject; Mastra structured outputs; idempotent inbound dedupe; Zod-validated boundaries.

**Stubbed or naive — needs real implementation**
- **Auth**: ✅ Clerk wired — Organizations, Google SSO, JWT-derived `firmContext`, Svix-verified webhook syncs `users` + `memberships` + `firms.clerk_org_id`. Audit log actor is now real `userId`. Pending: pilot's `hd` claim enforcement once domain is set.
- **Audit log immutability**: ✅ Postgres BEFORE-UPDATE-OR-DELETE trigger raises and rolls back any write attempt. Tombstone-PII transaction implemented for 削除要求 — preserves audit trail, replaces client/inquiry/draft text. **Pending:** S3 Object Lock export cron (deploy-time only).
- **Pipeline durability**: ✅ Inngest wraps the agent call. Webhook now does fast/sync work (firm/client lookup, PII mask, persist inquiry, audit `inquiry.received`) and publishes `inquiry.queued` event with idempotency key `inquiry-${inquiryId}`. Inngest function `draft-inquiry` calls the Mastra workflow inside `step.run('draft', ...)` for memoised retries. Concurrency capped at 5 per firm.
- **Observability**: ✅ Sentry on web (3 runtime configs + `instrumentation.ts` + `withSentryConfig` for source maps + `tunnelRoute: '/monitoring'` to bypass ad-blockers) and on agents (`@sentry/node` init in `src/lib/sentry.ts` imported first by Mastra index). LLM traces flow from Mastra to Langfuse Cloud via the first-party `@mastra/langfuse` exporter, with `maskInput` / `maskOutput` running `redactPIIDeep` on every payload before egress. Sentry's `beforeSend` runs `redactPII` on messages, exception values, breadcrumbs, request data. **Pending (Phase-2 tightening):** OTel Collector in our VPC for centralised redaction + Langfuse self-host in Tokyo.
- **Email parsing**: ✅ `mailparser` in raw-MIME mode handles ISO-2022-JP correctly (the SendGrid pre-parsed bug is bypassed). RFC-2047 encoded-word headers, multipart/alternative, attachment buffers all decoded properly. Threading headers (Message-ID, In-Reply-To, References) extracted and persisted to `inquiry.headers` JSONB.
- **Email sending**: ✅ `@sendgrid/mail` wrapper [`sendReply`](packages/email/src/sender.ts) attaches custom Message-ID / In-Reply-To / References headers + customArgs (`idempotencyKey = draft.id`, `firmId`, `inquiryId` round-trip into Event Webhook). Outbound Message-ID format `<{draftId}@reply.zeiro.jp>` so subsequent customer replies thread back. `sendDraft` action calls SendGrid, persists outbound IDs to `draft.metadata`, flips inquiry status to `sent`, audits.
- **Delivery feedback**: ✅ SendGrid Event Webhook handler at `/api/webhooks/sendgrid-events` verifies ECDSA signature via `@sendgrid/eventwebhook`, dispatches `delivered` / `bounce` / `dropped` / `spamreport` events through idempotent state transitions (delivered: only fires once thanks to `metadata.deliveredAt` check; failures revert inquiry status to `escalated` and patch failure reason). All transitions audited. customArgs (firmId+inquiryId) flow back into the event so we don't need cross-tenant DB lookups in the handler.
- **Onboarding**: ✅ `/onboarding/welcome` resolves the firm via Clerk `orgId`, polls every 2s until our DB sync from the Clerk webhook completes, then displays the firm's auto-assigned inbound address (`inquiry-{slug}@reply.zeiro.jp`) with a copy-to-clipboard button and "share with your clients" checklist. Both `OrganizationList` and `CreateOrganization` route through `/onboarding/welcome` post-action.
- **Knowledge ingestion (P1.3 turn 1)**: ✅ `/knowledge/new` form accepts text paste or `.txt` / `.md` / `.eml` upload. Pipeline: parse (`mailparser` for `.eml`) → `chunkJapanese` (400-char sentence-boundary chunks with 1-sentence overlap; Sudachi WASM is Phase-2) → batched OpenAI embeddings via Vercel AI SDK `embedMany` → `insertKnowledgeChunk` raw SQL with metadata (`documentId`, `documentVersion`, `chunkIdx`, `embeddingModel`, `requiresReview`, `status`, `ingestedAt`). Server action also writes a `knowledge.updated` audit row attributed to the actor.
- **Hybrid retrieval (P1.3 turn 2)**: ✅ Migration `20260510150000` adds a stored `tsvector` column on `knowledge_chunks` with a GIN index, redefines `match_knowledge` to filter `requires_review`, and adds `match_knowledge_text` for Postgres FTS BM25-ish ranking via `ts_rank_cd`. Repo now exposes `searchKnowledgeVector` + `searchKnowledgeBM25` independently. `hybridSearch`: parallel vector top-30 + BM25 top-30 → RRF (k=60) top-10 → Cohere Rerank 3.5 top-5 → drop hits below `RERANK_THRESHOLD=0.3`. Cohere is optional via `COHERE_API_KEY`; without it, RRF result returns raw.
- **Citations + verifier (P1.3 turn 3)**: ✅ Drafter no longer uses a Mastra `Agent` — replaced by direct `@anthropic-ai/sdk` call ([`anthropic-draft.ts`](apps/agents/src/lib/anthropic-draft.ts)) that feeds retrieved chunks as `document` content blocks with `citations: { enabled: true }`. Response text blocks come back annotated with citation pointers (`document_index`, `cited_text`); we map back to our `Citation { source, snippet }`. The orchestrator [`draft-reply.ts`](apps/agents/src/lib/draft-reply.ts) implements **two-gate refusal**: gate 1 = retrieval returned 0 hits → `no_draft`; gate 2 = drafter returned 0 citations → `no_draft`. Mastra workflow `draftStep` is now a thin wrapper that calls `draftReply`. The unused `draftAgent` was deleted (per "no dead code" rule). Confidence is derived from citation count (`min(1, count / 3)`).
- **Eval scaffold (P1.3 turn 3)**: ✅ `apps/agents/src/eval/{types,golden-set,runner}.ts` + `pnpm --filter @zeiro/agents eval`. Runner expects `EVAL_FIRM_ID` env (the firm whose KB to test against), iterates the seeded `GOLDEN_CASES`, runs full triage→draft pipeline per case, scores: `kind` match (draft/no_draft/escalate), citation count vs `minCitations`, source containment vs `mustMentionSources`. JSON report on stdout, exit code = passed/total. Pilot's tax accountant fills in 100-300 real cases over the engagement; weekly run gives drift signal.
- **Inline draft editor (P1.4)**: ✅ `DraftReviewForm` (client) replaces `DraftCard` + `DetailActions`. Single `<form>` with three submit buttons each carrying their own `formAction` prop (React 19): `却下` → `rejectDraft`, `編集して送信` → `sendEditedDraft`, `そのまま送信` → `sendDraft`. The latter two are mutually exclusive via `disabled` — only the matching button is enabled depending on whether the user has edited. Editing toggles a textarea (`textarea.draft-body` styled to match the design's `[contenteditable="true"]` background). Edit body flows through controlled state into a hidden `<input name="body">`. Audit metadata for `draft.sent` now includes `edited` boolean, original/sent lengths, and the full `sentBody` when edited — eval script can compute Levenshtein distance from `drafts.body` vs `audit_events.metadata.sentBody` to track edit-distance KPI per req §8 (target adoption ≥60%).
- **Assignment (P1.4)**: ✅ Migration `20260510160000` adds `inquiries.assigned_to_id UUID FK→users(id) ON DELETE SET NULL` + `(firm_id, assigned_to_id)` index. `createInquiry` now copies `client.assigned_tax_accountant_id` onto each new inquiry, so the firm's per-client default routing carries through automatically. `setInquiryAssignee` for explicit reassignment. `findAdminUserId(firmId)` returns the first membership row matching `role contains 'admin'` (Clerk's `org:admin` covers it). `EscalateBanner`'s 「所長へ割当」 button is now a real `<form action={assignToAdmin}>` — sets the inquiry's assignee to the firm's admin and audits `inquiry.assigned`. Sidebar 担当 section is two real Links (`?assignee=me` / `?assignee=all`) with current user's name + count of their inquiries; `me` is the default URL state. List filters client-side by `inquiry.assignedToId === currentUserId`.
- **Conversation thread view (P1.4)**: ✅ Migration `20260510170000` adds self-FK `inquiries.parent_inquiry_id` (ON DELETE SET NULL). On inbound, `findParentInquiryId` walks `headers.inReplyTo` then `headers.references` and looks each up via `findDraftByOutboundMessageId` (JSON-path query on `drafts.metadata->>'outboundMessageId'`) — the outbound Message-ID format `<{draftId}@reply.zeiro.jp>` from `buildOutboundThread` is the join key. New `walkThread(firmId, anchorId)` runs a recursive CTE to collect every inquiry in the thread (walks both up and down from any anchor), then a typed Prisma fetch with `client` + latest draft. Detail page renders a `CONVERSATION HISTORY` section above `ORIGINAL MESSAGE` listing prior inquiries with timestamp, status chip, subject, body preview, and the latest draft subject; clicking a row navigates into that inquiry's full detail. Section is suppressed when the thread has only the current inquiry.
- **⌘K search (P1.4)**: ✅ Inquiry list's existing search input is now controlled. `Cmd/Ctrl+K` from anywhere on the inbox page focuses + selects the input; `Esc` while focused clears the query and blurs. Substring-matches (case-insensitive) over subject + body + client name + client email, composes with the existing status / category / assignee filters via the same `useMemo`. Phase-2 swap: when inquiry counts grow, replace the substring scan with Postgres FTS over a stored `tsvector` column (same pattern we already use for `knowledge_chunks` BM25), debounced server action returning matched IDs.
- **Knowledge auto-add from sent drafts (P2.1, F-50)**: ✅ After `sendCore` writes the `draft.sent` audit, it publishes a `knowledge.auto_add` Inngest event (idempotency key `auto-add-${draftId}`). Async function `autoAddKnowledgeFn` (concurrency 3 per firm, 3 retries) fetches the inquiry + latest draft + sentBody (via `findLatestSentBody` reading the audit log; falls back to `draft.body` for unedited sends), skips replies under 50 chars, then runs `ingestKnowledge` with `source: "過去回答 / {clientName} / {YYYY-MM-DD}"` and `documentId = inquiryId` (so we can trace back to the original inquiry). Audits `knowledge.updated` with `metadata.source = "auto_add_from_sent"`. The KB grows automatically with every approved reply — pilot's draft-adoption KPI should compound week-over-week.
- **LINE Official Account channel (P2.2)**: ✅ Migration `20260510180000` adds `firm_channels(firm_id, channel_type, config, enabled)` for per-firm channel secrets, `clients.line_user_id` with composite unique index, and `inquiries.channel` defaulting to `"email"`. Inbound: `/api/channels/line/[firmId]` loads `FirmChannel` config, verifies `X-Line-Signature` HMAC against the raw body (timing-safe), Zod-parses, then `processLineEvents` looks up client by `(firmId, lineUserId)`, masks PII, persists with `channel: 'line'` and synthetic message-id `line:{event.message.id}`, audits, and reuses the `inquiry.queued` Inngest event so the rest of the pipeline (triage → RAG → draft → review) is unchanged — channel is just a tag on the inquiry. Outbound: `sendCore` branches on `inquiry.channel`; LINE path calls `dispatchLine` which POSTs to `https://api.line.me/v2/bot/message/push` (always push, never reply — human review exceeds the 30s reply-token TTL). Audit + draft.metadata record `channel`, `outboundMessageId`, plus `sgMessageId` (email) or `lineRequestId` (line). The Mastra workflow never sees LINE — it stays channel-agnostic per the §4.1 design.
- **LINE settings UI (P2.3)**: ✅ `/settings` server-renders the firm's webhook URL (computed from `headers()` host) with a copy button, plus a `<LineChannelForm>` (admin-only — `requireFirmContext` returns `role` and the page hides the form for non-admins; the action also re-checks). `saveLineChannel` validates, supports blank-preserves-existing on both `channelSecret` and `channelAccessToken` so admins can toggle `enabled` without re-entering credentials, audits `channel.configured` with `{ channelType, enabled, secretsRotated }`. Topbar settings icon is now a `<Link href="/settings">`. **Out of scope this slice:** LINE userId ↔ client mapping UI (still manual via Prisma Studio; unmatched events visible in audit log); secrets at rest still plain JSON in `firm_channels.config` (Phase-2: KMS or dedicated secret store); image/sticker/flex message support; account-link flow.
- **RAG**: single-stage cosine retrieval, no reranking, no citation enforcement, no refusal calibration.
- **Pipeline durability**: webhook calls agents synchronously. No queue, no retries, no observability.
- **Channels**: only email. No LINE, no web form. No adapter abstraction.
- **Knowledge ingestion**: no UI, no document parser, no re-embed pipeline, no freshness/version tracking.
- **Eval**: nothing. No golden set, no online metrics, no drift detection.
- **Outbound email**: not implemented at all (we only receive). When we add send, every "deliverability gotcha" research found applies.

---

## 2. End-to-end flows

### 2.1 Inbound email flow (production-grade target)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Customer mailbox                                                            │
│  └─ writes to inquiry@firm-a.zeiro.jp (or firm's own domain — see ADR-1)    │
└──────┬──────────────────────────────────────────────────────────────────────┘
       │ SMTP, TLS-mandatory
       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ MX → AWS SES inbound (ap-northeast-1) [residency-critical]                  │
│  ├─ Receipt rule writes raw .eml to S3 (Tokyo, SSE-KMS, tenant-prefixed)    │
│  └─ SNS event → Lambda (Tokyo) → POSTs to /api/inbound/:tenant              │
└──────┬──────────────────────────────────────────────────────────────────────┘
       │ HTTPS, request signed via SNS message signature (verifiable)
       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Next.js webhook /api/inbound/[tenantId]                                     │
│  ├─ Verify SNS signature; dedupe on sha256(message-id + recipient + raw)    │
│  ├─ Persist raw .eml pointer + parsed message (Prisma)                      │
│  ├─ Mask PII (My Number) BEFORE any downstream call                         │
│  └─ Emit Inngest event: `inquiry.received` (idempotency key = msg hash)     │
└──────┬──────────────────────────────────────────────────────────────────────┘
       │ ack 200 immediately (under 1s)
       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Inngest function (Tokyo region) wraps Mastra workflow                       │
│  step.run("triage")     → Gemini Flash → category + urgency + confidence    │
│  step.run("rag.fetch")  → hybrid (BM25 + pgvector) → Cohere Rerank → top-5  │
│  step.run("draft")      → Claude Sonnet + Citations API on retrieved docs   │
│  step.run("verify")     → reject draft if any factual claim lacks citation  │
│  step.run("persist")    → save Inquiry/Draft/AuditEvent (idempotent upsert) │
└──────┬──────────────────────────────────────────────────────────────────────┘
       │ each step traced to Langfuse (self-hosted Tokyo); errors → Sentry
       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Review UI shows draft → human edits → "send"                                │
│  Server action → Outbound adapter → email is sent via firm's sending domain │
│  Audit row written; sent draft promoted to Knowledge (auto-add per F-50)    │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Why SES Tokyo for inbound, not SendGrid:** SendGrid does not publish a Japan processing region — message bodies transit US datacenters. For 税理士法 §38 守秘義務 + APPI, a compliance officer can defensibly approve SES (raw mail lands in S3 Tokyo, never leaves the region) but will likely flag SendGrid Inbound. (ADR-1.)

### 2.2 Outbound reply flow

```
Reviewer clicks "そのまま送信" in inbox UI
  ▼
Server action loads draft + original inquiry's Message-ID + thread headers
  ▼
EmailReplyAdapter.send({
  from:        firm's authenticated sender (e.g. reply@mail.firmA.co.jp),
  to:          inquiry.client.primary_email,
  subject:     "Re: " + inquiry.subject  (do not translate prefix),
  in-reply-to: <inquiry.message_id>,
  references:  inquiry.references + " " + inquiry.message_id,
  body:        draft.body,
  custom_args: { idempotency_key: sha256(tenant|inquiry|revision) }
})
  ▼
Provider (SendGrid subuser=firmA OR SES Tokyo) sends; receipt event captured
  ▼
Bounce/complaint webhook (ECDSA-signed, dedupe on sg_event_id)
  ▼
On bounce: revert inquiry status to escalated; alert reviewer
On delivered: audit "draft.delivered"; (optionally) auto-add answer to KB
```

**Sending-domain pattern (ADR-2):** the only DMARC-aligned approach is for each firm to **CNAME-delegate DKIM** from their organisational domain to our ESP (e.g. firm publishes `s1._domainkey.mail.firmA.co.jp → s1.domainkey.uXXXX.wlYYY.sendgrid.net`). Then `From: 担当者 <reply@mail.firmA.co.jp>` aligns SPF + DKIM + DMARC to the firm. Without this, Gmail shows "via zeiro.jp" and DMARC fails → docomo / Yahoo Japan / au may silently drop. **Onboarding includes a DNS step.** Fallback for non-DNS-friendly firms: send as `firmA-reply@out.zeiro.jp` with display name "税理士法人A" — works deliverably but loses brand alignment.

### 2.3 Knowledge ingestion flow

```
Source: PDF / Word / Notion / past-email-mbox / firm's CSV of FAQs
  ▼
Upload UI (knowledge tab "新規追加") OR scheduled connector (Notion poll)
  ▼
Document parser (mailparser for .eml; tika or unstructured for PDFs)
  ▼
Sudachi Mode B sentence/clause split → 200-400 token chunks with header-prefix
  ▼
For each chunk:
  - Embed (Voyage-3, 1024 dim — pending JMTEB validation, see ADR-3)
  - Persist KnowledgeChunk { firm_id, source, content,
                              embedding, metadata: { document_id, version,
                              embedding_model, chunk_idx, requires_review,
                              source_law_revision, ingested_at } }
  ▼
Two indices for hybrid retrieval:
  - pgvector ivfflat on embedding (cosine)
  - pg_textsearch BM25 on Sudachi-normalized content
  ▼
Retrieval at query time:
  - BM25 top-30 ∪ vector top-30
  - RRF fuse → top-10
  - Cohere Rerank 3.5 (Japanese-strong) → top-5
  - threshold cut: drop chunks with rerank_score < τ
  - if empty after threshold → return no_draft (don't call drafter)
  ▼
Drafter (Claude Sonnet + Citations API) receives top-5 as custom-content docs
  ▼
Citations block in response → server-side verifier ensures every factual
sentence has at least one citation pointer; reject and re-prompt or escalate.
```

**Knowledge freshness (F-52 mandatory review):** when 法令 changes, a single SQL update flips `metadata.requires_review = true` on all chunks tagged with the affected law section. Retrieval `WHERE metadata->>'requires_review' = 'false'`. Reviewer UI flips it back chunk-by-chunk after human approval. Old chunks are kept (audit trail) but excluded from retrieval. New chunks link via `superseded_by`.

### 2.4 LINE Official Account flow (Phase 2)

```
Customer sends LINE message
  ▼
LINE platform → POST /api/channels/line/[firmId]
  ├─ x-line-signature = HMAC-SHA256(channelSecret, raw_body) — verify timing-safe
  ├─ payload.destination identifies the bot (= the firm)
  └─ events[] each contains source.userId + replyToken (30s TTL, single-use)
  ▼
LineInputAdapter.parse() → IncomingMessage[]
  ├─ identity = { externalId: source.userId, channel: "line" }
  └─ replyContext = { replyToken, expiresAt }
  ▼
[Same Mastra pipeline as email — workflow does not know it's LINE]
  ▼
LineReplyAdapter.send(draft):
  if replyContext.expiresAt - now < 5s OR token already used:
    POST /v2/bot/message/push (counts toward billed messages)
  else:
    POST /v2/bot/message/reply (free)
  Map draft → text + (optional) flex-message with citations as buttons
```

**Identity resolution across channels:** never auto-merge `LINE userId` to `email`. Same human on both channels = two `ChannelIdentity` rows pointing to one `Person` only after explicit linking (e.g. customer types email in LINE, or scans a QR with their email account).

---

## 3. Feature inventory

### 3.1 UI surfaces

| Status | Surface | Notes |
|---|---|---|
| ✅ | Inbox list + detail | Per design files. |
| ✅ | Knowledge browse | Stats + table per design. **Missing:** add/edit/delete; freshness flag UI; bulk-flag for 法改正. |
| ✅ | Analytics dashboard | KPIs + category split. **Missing:** time-window queries (今日/7日/30日/四半期), real adoption-rate from edit data, audit log explorer. |
| ⛔ | Auth + onboarding | Login, Google Workspace SSO, firm signup, invite staff, accept invite. |
| ⛔ | Settings | Firm profile, sending domain DNS instructions, channel connections, team & roles, billing. |
| ⛔ | Knowledge ingestion | File upload, mbox import, Notion connector setup, ingestion progress, version diff view. |
| ⛔ | Conversation thread view | When customer replies to a sent draft, show the full thread (not just the latest inquiry). Required so reviewer has context. |
| ⛔ | Reviewer keyboard shortcuts + ⌘K search | Design shows them; not wired. |
| ⛔ | Draft inline editor | "編集して送信" — content-editable area, capture diff for eval. |
| ⛔ | Assignment UI | "所長へ割当" + per-staff inbox filter. |
| ⛔ | Mobile-friendly view | Design is desktop-only (1440px). Probably out of scope for MVP. |

### 3.2 Channels (input + reply)

| Status | Channel | Phase |
|---|---|---|
| ✅ | Email inbound (SendGrid Parse, dev-only) | Move to SES Tokyo for prod (ADR-1). |
| ⛔ | Email outbound | Phase 1. SES Tokyo or SendGrid subuser-per-firm. |
| ⛔ | Web contact form widget | Phase 1. Cloudflare Turnstile + per-firm `siteKey`. Reply path = email. |
| ⛔ | LINE Official Account | Phase 2. Per-firm Channel; v2.1 access tokens with rotation. |
| ⛔ | Slack / MS Teams | Phase 3. Same adapter shape. |
| ⛔ | Phone voicemail → transcript → inbox | Phase 3+. Dependencies: Twilio voice, Deepgram. |

### 3.3 Core agent pipeline (durable + observable)

| Status | Component | Notes |
|---|---|---|
| ✅ | Triage agent (Gemini Flash, structured output) | |
| ✅ | Escalation rule (deterministic) | |
| ⚠️  | Draft agent | Currently calls knowledge-search returning empty. Needs Citations API (ADR-4). |
| ⛔ | Hybrid retrieval (BM25 + vector) + reranking | ADR-3. |
| ⛔ | Citation-coverage verifier | Reject drafts where factual sentences lack a citation. |
| ⛔ | Refusal calibration | Two-gate: pre-LLM rerank-score threshold + post-LLM verifier. |
| ⛔ | Durable workflow (Inngest + Mastra steps) | ADR-5. |
| ⛔ | Per-tenant cost attribution + tracing | Langfuse (ADR-6). |

### 3.4 Knowledge management

| Status | Capability | Notes |
|---|---|---|
| ⛔ | Multi-format document parser | PDF, Word, mbox, Notion. Use unstructured.io or tika. |
| ⛔ | Sudachi-aware chunking | Mode B for general, header-prefix injection. |
| ⛔ | Embedding pipeline (Voyage-3, pending JMTEB validation) | ADR-3. |
| ⛔ | Hybrid index (pg_textsearch / VectorChord-BM25 + pgvector) | ADR-3. |
| ⛔ | Per-chunk versioning & freshness flags | `requires_review`, `superseded_by`, `embedding_model`. |
| ⛔ | Auto-add from sent drafts (F-50) | When a draft is sent unedited and has citations, the answer span itself becomes a new KB chunk. |
| ⛔ | Mandatory review on 法改正 (F-52) | Bulk flag by `source_law_revision`. |
| ⛔ | Confidence-weighted retrieval (顧問先 specific notes preferred over general FAQ) | Boost rerank weight on chunks tagged `client_id == this_inquiry.client_id`. |

### 3.5 Tenant + auth

| Status | Capability | Notes |
|---|---|---|
| ⛔ | Auth provider (Logto, ADR-7) | |
| ⛔ | Google Workspace SSO with `hd` claim enforcement | Reject personal Gmail for firm scope. |
| ⛔ | Multi-firm membership (one user → many firms) | Necessary for partners and shared accountants. |
| ⛔ | RBAC: 所長 / 担当税理士 / 事務員 | Centralised `withFirmScope()` helper. |
| ⛔ | Invitation flow | Admin creates invite → email link → accept via SSO. |
| ⛔ | Audit log actor resolution from JWT | Replace SYSTEM_ACTOR uuid stub. |

### 3.6 Compliance & ops

| Status | Capability | Notes |
|---|---|---|
| ✅ | PII mask (My Number) at ingest | |
| ✅ | Audit log table (Update: never type) | Add Postgres-level `REVOKE UPDATE, DELETE` on the role; export to S3 Object Lock for 5-year WORM. |
| ✅ | Tenant isolation by `firm_id` (app-level) | |
| ⛔ | OTel Collector with PII redaction processors | Strip マイナンバー patterns before traces leave VPC. |
| ⛔ | LLM observability (Langfuse self-hosted Tokyo) | ADR-6. |
| ⛔ | Sentry for application errors | |
| ⛔ | 削除要求 / RTBF flow | Tombstone PII in client tables; preserve audit log. |
| ⛔ | DR + backups (Neon PITR + S3 cross-region replication) | |
| ⛔ | DPA + APPI cross-border consent docs (if any provider is non-JP) | |

### 3.7 Eval & monitoring

| Status | Capability | Notes |
|---|---|---|
| ⛔ | Golden set (100-300 labeled past Q&A pairs per pilot firm) | Tax accountant labels: which chunks should appear, acceptable answer span, "should refuse" cases. ~15% holdout never used for tuning. |
| ⛔ | CI eval gate (Mastra evals on golden set; block merges that regress) | |
| ⛔ | Online metrics (Langfuse Scores) | Send-without-edit rate, edit-distance, citation coverage, refusal rate, false-refusal rate. |
| ⛔ | Drift detection (rolling avg of edit-distance) | |
| ⛔ | Human annotation queue (Langfuse) → dataset promotion → regression eval | |

---

## 4. Modularity contracts

The whole point: a future "we want to support Slack" should require zero changes to the agent pipeline and zero changes to existing channels.

### 4.1 Channel adapters

```ts
// Workflow only sees these. No SDK imports beyond this boundary.
type IncomingMessage = {
  tenantId: string;
  channel: 'email' | 'line' | 'web_form' | 'slack' | string;
  externalMessageId: string;             // for idempotency
  thread?: { id: string; references?: string[] };
  identity: { externalId: string; displayName?: string; email?: string };
  subject?: string;                      // optional — LINE has no subject
  body: string;                          // PII already masked
  attachments: Attachment[];
  receivedAt: Date;
  replyContext: unknown;                 // opaque blob the reply adapter needs
};

type Draft = {
  subject?: string;
  body: string;
  attachments?: Attachment[];
  citations: Citation[];
};

interface InputAdapter {
  channel: string;
  verifySignature(req: Request, secrets: TenantSecrets): Promise<boolean>;
  parse(req: Request, secrets: TenantSecrets): Promise<IncomingMessage[]>;
}

interface ReplyAdapter {
  channel: string;
  capabilities: {
    attachments: boolean;
    threading: boolean;
    richLayout: boolean;       // LINE flex, email HTML, Slack blocks
    pushAfterTtl: boolean;     // can the channel send after the reply token expires?
  };
  send(
    incoming: IncomingMessage,
    draft: Draft,
    secrets: TenantSecrets,
  ): Promise<{ externalId: string; deliveredAt: Date }>;
}
```

- Registry: `Map<channel, { input: InputAdapter; reply: ReplyAdapter }>`
- Per-tenant config: `tenant_channels(firm_id, channel, secret_ref, enabled)`
- Boundary route `/api/channels/[channel]/[firmId]` → load secrets → dispatch
- The Mastra workflow imports neither the LINE SDK nor the SendGrid client. **Ever.**

### 4.2 Knowledge sources

Same pattern, different shape:

```ts
interface KnowledgeSource {
  kind: 'upload' | 'notion' | 'gmail-mbox' | 'gdrive' | string;
  ingest(input: SourceInput, firmId: string): AsyncIterable<RawDocument>;
}

// shared pipeline takes RawDocument → chunked → embedded → indexed
```

Adding a new source is one file, no pipeline changes.

### 4.3 Pipeline steps

Each Mastra `step.run()` is:
- **Idempotent** against the DB (use `externalMessageId` + step-name as key).
- **Deterministic given inputs** (so step memoization on retry is safe).
- **Side-effect at exactly one boundary** (e.g. the persist step writes; the draft step doesn't write).

This lets us swap the queue (Inngest → Trigger.dev → Temporal) without rewriting the pipeline.

---

## 5. Architecture decisions (ADRs)

### ADR-1: SendGrid Inbound Parse for MVP (resolved — fastest signup)
**Decision:** SendGrid Inbound Parse for both dev and pilot. Migrate inbound to AWS SES Tokyo in Phase 2 (pre-multi-firm rollout).
**Rationale:** AWS SES starts in sandbox; production access requires a manual review that takes 24-48h+ and adds Lambda/IAM/S3 setup. SendGrid Inbound Parse is same-day: create subuser → set MX → configure webhook. We need to ship.
**Trade-off accepted:** mail bodies transit US datacenters. Pilot firm signs an APPI cross-border-transfer consent in the engagement contract (consistent with their existing trust in Notion/Google Workspace/Anthropic — all of which already transit US).
**MIME hardening (still required):** turn on "POST raw, full MIME message" so we parse with `mailparser` ourselves — SendGrid's pre-parsed fields mishandle ISO-2022-JP. Decode RFC 2047 encoded-word headers explicitly.
**Idempotency:** SendGrid does not provide a dedup key on Inbound Parse. We hash `Message-ID + recipient + sha256(raw_mime)` with a 7-day TTL store.
**Auth:** Basic Auth on the webhook URL + Twilio IP allowlist + size cap (30 MB).
**Phase-2 migration plan:** when we onboard firm #2 we file the SES production-access form, set up SES Tokyo + S3 + Lambda, run dual-ingest for 1 week to validate parity, then cut over MX. The `InputAdapter` interface (§4.1) means the workflow doesn't change.

### ADR-2: Send as `*.zeiro.jp` for MVP (resolved — no firm DNS step)
**Decision:** Outbound via SendGrid (same provider as inbound for MVP). Sender = `"税理士法人 凜事務所" <reply-firmA@reply.zeiro.jp>` — display name = firm, sending domain = ours. Per-firm SendGrid subuser for reputation isolation.
**Why not firm-owned subdomain at MVP:** that requires the firm's IT to publish DKIM CNAMEs in their DNS — adds onboarding wait that depends on a third party we don't control (the firm's IT vendor or Workspace admin). For pilot speed, ours.
**Deliverability OK:** we own `zeiro.jp` so SPF/DKIM/DMARC align under our domain. Yahoo JP + docomo + au accept this. Cosmetic: Gmail/Outlook show "via reply.zeiro.jp" in the From line but it's a recognised pattern (Gmail itself uses similar for forwarded mail).
**Threading (still required):** copy inbound `Message-ID` into outbound `In-Reply-To`; build outbound `References` = inbound `References` + inbound `Message-ID`. Generate outbound Message-ID as `<{idempotency_key}@reply.zeiro.jp>` so customer replies thread correctly.
**Idempotency:** key = `sha256(tenant|inquiry|revision)`. SendGrid Custom Args round-trip the key into Event Webhook deliveries.
**Bounce / complaint handling:** SendGrid Event Webhook (ECDSA-signed, dedupe on `sg_event_id`); auto-suppress on hard bounce; revert inquiry status to `escalated` and alert reviewer.
**Phase-2 upgrade:** offer firms an opt-in "send under your own domain" flow — their IT publishes CNAMEs to a SendGrid authenticated-domain we provision per-firm, sender becomes `reply@mail.firmA.co.jp`. Same code path, different `From`/`Return-Path`.

### ADR-3: Hybrid retrieval (BM25 + vector) + Cohere Rerank 3.5
**Decision:** Use `pg_textsearch` (or VectorChord-BM25) for BM25 on Sudachi-tokenised text, pgvector for cosine on Voyage-3 embeddings, RRF fusion to top-10, Cohere Rerank 3.5 to top-5, then drafter call.
**Why hybrid:** tax/legal text has heavy lexical anchors (条文番号, 通達番号); vector-only loses recall on those. Cohere Rerank 3.5 is documented strong on Japanese.
**Why Voyage-3 (subject to validation):** vendor benchmarks claim +7.5% over OpenAI 3-small on multilingual. **Must validate on JMTEB with our own corpus before commit.** If unconvincing, stay on text-embedding-3-small.
**Cost:** ~$2 per 1k rerank queries. Negligible vs LLM cost.

### ADR-4: Anthropic Citations API for drafting
**Decision:** Drafter is Claude Sonnet 4.5 with Citations API; retrieved chunks supplied as custom-content documents (one per chunk → cleanest cite-to-chunk mapping). Server-side verifier rejects drafts where any factual sentence lacks a citation pointer.
**Trade-off:** Citations API is **incompatible with Structured Outputs**. We give up strict-JSON drafts; instead drafter emits free-form text + a citations array, and we parse server-side.
**Why this matters:** Citations enable byte-level verification — we can render the exact span in the source doc the model claimed to be quoting. Eliminates a class of hallucination ("the model made up a 通達 reference").

### ADR-5: Inngest managed for durable workflow (resolved)
**Decision:** Inngest managed (Cloud). Wrap each Mastra step in `step.run()` for memoised retries + idempotency. Idempotency key on the entry event = upstream message-ID hash.
**Why not Trigger.dev v4 self-hosted:** self-host means we operate the queue ourselves — slower path. Inngest signup is instant, native Mastra integration, function dashboard out of the box.
**Trade-off accepted:** Inngest workflow metadata transits non-JP datacenters. We never put PII in step inputs/outputs — only IDs (firmId, inquiryId, externalMessageId). The actual mail body lives in our DB. This is the same trust boundary as Anthropic/OpenAI/SendGrid — already accepted.
**Phase-2 tightening:** if a firm requires queue-metadata residency, swap to Trigger.dev v4 self-hosted in our Tokyo VPC. The pipeline-step interface is identical, swap is a config change.
**Why not Mastra workflows alone:** Mastra v1.x has durable workflows but the team itself ships an Inngest integration — strong signal workflows-alone aren't enough for production retry semantics.

### ADR-6: Langfuse Cloud + Sentry for observability (resolved)
**Decision:** Langfuse Cloud (managed; pick the JP-region option if available at signup, otherwise EU) + Sentry for application errors. Mastra's first-party Langfuse exporter wires up natively — no infra to run.
**Why not Langfuse self-hosted at MVP:** running ClickHouse + Postgres + Redis + S3 ourselves is real ops work; not blocked by a third-party review but slows us down. Mastra's exporter is identical for Cloud vs self-host so migration later is a config flip.
**Why not Helicone:** proxy-based — every Anthropic call routes through Helicone's edge. Adds a trust boundary we don't want for 守秘義務.
**Why not Braintrust SaaS:** closed-source; self-host requires Enterprise contract — slow path.
**Trade-off accepted:** trace data (which we redact aggressively before egress) sits on Langfuse infra. Nothing PII enters traces — see redaction below.
**Redaction (still required, even more important now that trace data leaves the VPC):** instrument Next.js via `@vercel/otel` → OTel Collector with `redaction` + `attributes` processors stripping マイナンバー patterns, email bodies, and 個人番号 fields from spans/logs/metrics before export. Mirror redaction at Mastra's `LangfuseExporter` (`maskInput`/`maskOutput` callbacks) as defence-in-depth. Per-tenant cost via Langfuse user/tag.
**Phase-2 tightening:** when first firm requires it, deploy Langfuse self-hosted in our Tokyo VPC; same Mastra exporter, different endpoint URL. ClickHouse + Postgres + Redis + S3 in `ap-northeast-1`. Estimate ≈1 week of setup + week of dual-export validation.

### ADR-7: Clerk for auth (resolved — fastest signup + best DX)
**Decision:** Clerk Organizations (org = firm). Google Workspace SSO with `hd` (hosted-domain) claim enforcement to reject personal Gmail for firm scope. JWT custom claims carry `{ sub, firm_id, role }`; `firm_id` populated by Clerk Webhooks on org-membership change.
**Why not Logto JP-cloud:** smaller ecosystem, fewer Next.js 16 examples in the wild. Clerk's `<OrganizationSwitcher/>`, `<SignIn/>`, and Server Action helpers cut auth integration time roughly in half.
**Why not Auth.js (NextAuth v5):** we'd be building orgs/RBAC/invitations/audit ourselves — months of work and a security surface area.
**Why not Supabase Auth:** global email uniqueness across the project — breaks for accountants on multiple firms / multiple Workspaces.
**Trade-off accepted:** Clerk auth data sits in US infra. APPI cross-border-transfer consent goes into the firm's pilot agreement (consistent with Notion / Google Workspace / SendGrid acceptance).
**Multi-firm membership:** model `memberships(user_id, firm_id, role)` ourselves — Clerk's `OrganizationMembership` is the source of truth at IdP, but we mirror in Postgres for joinable queries.
**Audit-log actor:** every Server Action calls `getFirmContext()` → `{ userId, firmId, role }` from Clerk session. `actorId` = our `users.id` (not Clerk's `sub`); we keep our own user row.
**Phase-2 tightening:** if a firm requires JP residency for auth, we either self-host Clerk's BYO data option or migrate to Logto JP-cloud. The `firmContext` interface stays the same; auth provider swap is a server-only change.

### ADR-8: Channel adapters via `InputAdapter` / `ReplyAdapter` interfaces
**Decision:** All channel-specific code lives behind the two interfaces in §4.1. The Mastra workflow has no awareness of LINE / email / web form. Adding Slack is one new file pair.
**Identity model:** `(channel, externalId) → ChannelIdentity → Person` with explicit linking only. No fuzzy auto-merge.

---

## 6. Roadmap (mapped to requirements §10)

### Phase 1 — MVP (≈3 months, 1 pilot firm)

The pilot must demonstrate: legal-grade reliability, real RAG quality, full audit trail. **No LINE, no fancy editing UX, no analytics history.**

**P1.1 Foundations (weeks 1-3)**
- Auth: Clerk integration, Google Workspace SSO with `hd` claim enforcement, `memberships` table mirroring Clerk's org membership, JWT custom claims `{ firm_id, role }`. (ADR-7)
- Replace `DEV_FIRM_ID` everywhere with real `firmContext` resolved from Clerk session in a request-scoped React `cache()`.
- Audit log hardening: Postgres role REVOKE on UPDATE/DELETE; S3 Object Lock export cron; tombstone-PII delete flow.
- Observability: `@vercel/otel` + OTel Collector with redaction processor → Sentry (errors) + Langfuse Cloud (LLM traces, tagged per-tenant). (ADR-6)
- Inngest managed wrapped around the Mastra workflow; each step idempotent against DB. (ADR-5)

**P1.2 Email (weeks 3-6)**
- Inbound: SendGrid Inbound Parse with raw-MIME mode + `mailparser` for proper ISO-2022-JP handling. Basic Auth + IP allowlist + 30 MB cap. Idempotency = sha256(Message-ID + recipient + raw). (ADR-1)
- Outbound: SendGrid subuser-per-firm. Sending domain `reply.zeiro.jp`. Threading via In-Reply-To/References (Message-ID format `<{idem_key}@reply.zeiro.jp>`). Bounce/complaint webhook (ECDSA-signed). (ADR-2)
- Onboarding screen: trivial — firm enters their inbound address (`inquiry@firm-a.zeiro.jp`), no DNS step required from them.

**P1.3 RAG quality (weeks 4-9, parallel)**
- Knowledge ingestion UI (single-file upload + mbox import).
- Sudachi chunking + Voyage-3 embedding pipeline (after JMTEB validation).
- Hybrid retrieval (pg_textsearch + pgvector + RRF + Cohere Rerank 3.5). (ADR-3)
- Drafter swap to Claude Sonnet + Citations API. Server-side citation-coverage verifier. (ADR-4)
- Two-gate refusal: pre-LLM threshold + post-LLM verifier. Always honour `no_draft`.

**P1.4 Eval (weeks 6-9)**
- Build golden set with the pilot firm (100 labeled past Q&A).
- Mastra evals in CI (block PRs that regress on golden set).
- Langfuse Scores in production: send-without-edit, edit-distance, citation-coverage, refusal-rate.
- Weekly drift report.

**P1.5 Review UX polish (weeks 7-10)**
- Inline draft editor with edit-diff capture for eval signal (F-42).
- Conversation thread view (multiple inquiries from same client across replies).
- ⌘K search (BM25 over inquiries first, vector later).
- Assignment UI (F-43).

**Pilot acceptance criteria** (per requirements §8 KPIs):
- Escalation rate 32% ± 5% over 30-day window.
- Draft adoption ≥60%.
- p95 receive→draft <90s.
- Zero compliance incidents.

### Phase 2 — Beta (4-6 months, 5 firms)

- LINE Official Account channel (per-firm provider/channel/bot).
- Web contact form widget.
- Knowledge auto-add from sent drafts (F-50).
- 法改正 mandatory review flow (F-52) with bulk-flag UI.
- Analytics: real time-window queries; per-staff KPIs; audit log explorer.
- Per-tenant cost reporting (LLM spend per firm from Langfuse).
- Invitation flow + role management UI.

### Phase 3 — General availability (7+ months)

- freee / MFクラウド read-only integrations (per requirements §10 Phase 3).
- Slack / MS Teams channel.
- Voicemail-to-inbox (Twilio + Deepgram) — Phase 3+.
- Multi-region failover (Tokyo primary + Osaka warm).
- Billing integration (Stripe; per-firm-per-顧問先).
- Marketplace / partner programme.

---

## 7. Resolved decisions (2026-05-10)

Optimised for "no third-party verification waits". Where a stricter compliance choice exists, it's queued as Phase-2 tightening with a known migration path.

| # | Topic | MVP choice | Phase-2 tightening | ADR |
|---|---|---|---|---|
| 7.1 | Inbound mail | SendGrid Inbound Parse | AWS SES Tokyo (run dual-ingest 1 week, then cut MX) | ADR-1 |
| 7.2 | Sending domain | `*.zeiro.jp` (per-firm subuser, display-name = firm) | Opt-in firm-owned subdomain via DKIM CNAME delegation | ADR-2 |
| 7.3 | Auth | Clerk (Organizations + Google Workspace SSO) | Logto JP-cloud or self-host if a firm requires JP residency | ADR-7 |
| 7.4 | Queue | Inngest managed | Trigger.dev v4 self-hosted in Tokyo if queue-metadata residency is required | ADR-5 |
| 7.5 | LLM observability | Langfuse Cloud + Sentry | Langfuse self-hosted in Tokyo VPC | ADR-6 |
| 7.6 | RAG retrieval | Hybrid BM25 (pg_textsearch) + Voyage-3 vector + Cohere Rerank 3.5 | Re-evaluate against JMTEB on real corpus before scaling | ADR-3 |
| 7.7 | Drafter | Claude Sonnet + Citations API + server-side coverage verifier | n/a — this is the long-term plan | ADR-4 |
| 7.8 | Knowledge sources at MVP | File upload (PDF/Word/CSV) + mbox import | Notion / Gmail-archive connectors at Phase 2 | — |
| 7.9 | Refusal calibration | Start aggressive (τ tuned to keep escalation ≈40% week 1), relax weekly to 32% | Continuous weekly recalibration from eval signal | — |
| 7.10 | Eval golden set | 100 labeled Q&A pairs from pilot firm; 8h labeling baked into pilot SOW | Continuous additions from sent drafts (auto-add per F-50) | — |
| 7.11 | Send mode | **Always human-reviewed.** No auto-send. (Per requirements §3.) | n/a — permanent constraint | — |

### Compliance posture for the pilot

The pilot firm signs a single APPI cross-border-transfer consent that covers Clerk (auth), SendGrid (mail), Inngest (queue metadata), Langfuse (LLM traces, redacted), Anthropic + Google + Voyage + Cohere (LLM/embedding/rerank). This is the same shape as the consent they already give Notion / Slack / Google Workspace.

**Things we never compromise even at MVP:**
- PII (My Number) masked at ingest, before any LLM call. (✅ already implemented)
- Tenant isolation enforced at the repository layer with `firm_id` on every query. (✅ already enforced via `withFirmScope` pattern in §4)
- Audit log append-only with Postgres role REVOKE. (Ship in P1.1.)
- LLM no-training contracts (Anthropic, Voyage, Cohere all confirmed; Google Vertex/Gemini Flash needs the no-training endpoint variant — verify at integration time).
- OTel-level PII redaction before any telemetry leaves the VPC. (Ship in P1.1.)
- LLM provider chosen so that we can swap to Anthropic-Bedrock-Tokyo if a firm requires it (one-line model identifier change, since AI SDK abstracts).

---

## Appendix A — Research sources

The decisions above are grounded in 5 parallel research streams (Nov 2025-Feb 2026 sources). Inline citations live in each ADR. If anything looks wrong, ping the corresponding section to re-investigate.

## Appendix B — What this document does NOT cover

- Pricing model (¥-per-顧問先 vs ¥-per-seat vs ¥-per-message). Out of scope; product decision.
- Marketing site, sales motion, partnerships with 税理士会.
- Internationalisation beyond Japan (out of scope per requirements).
- On-call / incident response runbooks.
- Mobile native apps.
