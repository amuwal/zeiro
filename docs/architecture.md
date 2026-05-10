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
- **Mandatory review on 法改正 (P2.4, F-52)**: ✅ Repo additions `flagKnowledgeChunk` / `unflagKnowledgeChunk` flip `metadata.requiresReview` and stamp `reviewReason` + `reviewFlaggedBy` + timestamp. The retrieval functions `match_knowledge` and `match_knowledge_text` already filter `WHERE COALESCE((metadata->>'requiresReview')::boolean, false) = false`, so flipping a chunk to flagged immediately removes it from RAG without code changes. Three server actions (admin gates checked twice — page hides form, action re-checks): `flagChunk` per-row, `unflagChunk` per-row, `bulkFlagBySearch` runs the existing BM25 over the firm's tsvector to find candidates (top-200), flags each, audits a single `knowledge.updated { op: 'bulk_flag', query, reason, flagged }`. Knowledge page now has a filter Link toggle (`?status=review` ⇄ all), a 6-column table adding an 操作 column with per-row flag/unflag form-buttons, and an admin-only "法改正対応 · 一括フラグ" section above the table for keyword-bulk-flag. `readStatus` returns `'review'` whenever `requiresReview` is true (overrides any prior `metadata.status`), so the existing color-coded chip surfaces flagged chunks consistently. Audit trail covers both single and bulk operations.
- **LINE userId ↔ client mapping UI (P2.5)**: ✅ Closes the P2.3 "out of scope" gap. New repo query `listUnmatchedLineEvents(firmId, limit)` runs raw SQL grouping `audit_events` rows where `action='inquiry.received' AND metadata->>'unmatched'='true' AND metadata->>'channel'='line'` by `metadata->>'lineUserId'`, returning `{ lineUserId, count, firstSeen, lastSeen }` ordered by recency. New repo mutation `linkClientLineUserId(firmId, clientId, lineUserId)` writes `clients.line_user_id` inside the firm scope, returning a typed `{ ok: false, reason: 'not_found' | 'already_linked' }` discriminated union — `already_linked` is detected by catching Prisma `P2002` from the `(firmId, lineUserId)` composite unique index. New audit action `client.identity_linked` recorded with `{ clientId, channel, lineUserId }`. Server action `linkLineUserId` is admin-gated (page hides + action re-checks `role.toLowerCase().includes('admin')`). UI: `<PendingLineLinks>` client component renders a header row + one `<form>` per pending LINE userId (each with its own `useActionState`), showing the (truncated) userId, message count, last-seen date, a `<select>` of clients still without a `lineUserId`, and a 紐付け submit button that flips to "紐付け済" + dims the row on success. Settings page fetches `pending` and `clients` in parallel with the channel data, and only when `admin` is true (non-admins get an empty array, no DB hit). The mapping immediately routes future LINE messages from that user to the right client thread because inbound `processLineEvents` looks up `findClientByLineUserId(firmId, lineUserId)` per event. **Out of scope this slice:** unlinking a previously-linked LINE user (need to drop both `lineUserId` and any in-flight inquiries' client association — defer to the broader "client lifecycle" slice with merge/split flows); rich audit-log explorer surfacing the `client.identity_linked` events (P2.7 will cover audit log UI).
- **Web contact form (P2.6)**: ✅ Adds a third channel — a hosted public form at `/contact/[firmId]` that firms paste into their website, name card, or email signature. No new schema work: `firm_channels(channel_type='web', config={})` reuses the LINE-era table, and `inquiries.channel` already accepts arbitrary strings (just sets to `'web'`). New repo helper `findOrCreateClientByEmail(firmId, email, name)` upserts a Client row with `contractType='unverified'` if the submitted email is unknown — so reply path works (the existing `sendCore` else-branch dispatches via email when `inquiry.channel !== 'line'`), repeat submissions from the same email auto-thread to the same client, and the firm can later promote the client to a regular contract. Race-safe via `P2002` re-read. Pipeline: server action `submitContactInquiry` (bound to `firmId` via `.bind(null, firmId)` from the client component) → silent honeypot field check (`name="website"`, hidden via offscreen positioning) → `processWebInquiry` orchestrator validates with new `webFormSubmissionSchema` in `@zeiro/core` (name 1-200, email RFC + lowercased, subject 3-300, body 10-10000), runs an in-memory sliding-window rate limiter keyed `web:{firmId}:{ip}` (10/hr, 50k-entry GC ceiling — Phase-2 swap to Upstash/Redis when we shard), masks My Number, persists with synthetic message-id `web:{uuid}`, audits `inquiry.received { channel: 'web', via: 'web_form', clientCreated, ip, piiRedactions, submittedEmail, submittedName }`, and publishes the same `inquiry.queued` Inngest event the email + LINE paths use — so triage/RAG/draft/review are unchanged. Settings: admin-only `<WebChannelSection>` shows the firm's public form URL with a copy button and a single enable/disable toggle (`saveWebChannel` action audits `channel.configured { channelType: 'web', enabled }`); the public page itself reads `getFirmChannel(firmId, 'web').enabled` and renders a "受け付けていません" panel when disabled. Middleware adds `/contact/(.*)` to the public allowlist. The form is intentionally branded "Powered by Zeiro" — no per-firm theming yet, no embeddable JS widget, no CAPTCHA, no file attachments (each is a Phase-2 candidate). The honeypot + rate limit + Zod bounds are sufficient first-line defence; if abuse appears in pilot, Cloudflare Turnstile drops in as a hidden field with a server-side verification step in the orchestrator.
- **Time-window analytics + audit log explorer (P2.7)**: ✅ Replaces the Phase-1 hardcoded analytics with real, window-aware queries and exposes the audit trail to admins. New `apps/web/lib/analytics-window.ts` resolves a `?window=today|7d|30d|quarter` URL param into `{ current, previous, bucket, bucketCount, label }` — the previous range is the immediately-preceding equivalent slice (today vs yesterday, 7d vs prior 7d, etc.) so KPI deltas have a meaningful baseline. New repo `analytics.ts` (Postgres raw SQL): `getWindowKpis(firmId, start, end)` returns a single row with COUNT() FILTER (WHERE status = …) + AVG(EXTRACT(EPOCH FROM (first_draft.created_at - inquiry.received_at))) for `avgResponseSeconds` (using a correlated `MIN(d.created_at)` subquery so we don't need a join window per row); `getDailyBuckets(...)` returns `[{day, total, sent, escalated}]` rows pre-trunc'd by `date_trunc('day', received_at)` and densified client-side into a fixed-length sparkline array indexed by day offset; `getCategoryDistributionWindow(...)` group-by `analysis->>'category'`. `apps/web/lib/analytics.ts` composes these into 4 KPIs (escalation rate, draft-adoption rate, avg first-response minutes, total inquiries) with `formatDeltaPoints` (rate diffs in pp) vs `formatDeltaPct` (count diffs in %) — the right delta unit per metric so a 5pp drop in escalation reads as `-5.0pt` not `-50%`. `<PeriodPicker>` is a server-renderable Link cluster (no client state — every change is a navigation, so it survives full reload + bookmarks); analytics.css `.an-period > *` selector works for both the new `<a>` and any leftover `<button>`. The static mock `<AuditEvents>` is gone: it now takes real `AuditRow[]` from `listRecentComplianceEvents(firmId)` (filtered to the seven compliance-relevant actions), maps each action to `{ icon, jp, tone }` via shared `audit-display.ts`, and shows a "すべて表示 →" link to `/audit` for admins only. New `/audit` route (admin-only — page hides via `notFound()`, repo doesn't enforce since the page is the only entry): `listAuditEvents(firmId, filter, cursor, limit=50)` is a Prisma `findMany` with `orderBy: [{createdAt: 'desc'}, {id: 'desc'}]`, takes `limit + 1` to detect `hasMore`, and returns a typed `AuditCursor = { createdAt, id }` — the cursor is base64url-encoded JSON in the URL so deep-links survive paste. Filter shape `{ action?, actorId?, after?, before? }` — Prisma's `OR` on the cursor handles ties on `createdAt` correctly. UI: `<AuditFilters>` is a 3-col grid of `<select>` (action / actor / window) using `useRouter().push` inside `useTransition` so the table updates without nuking scroll; `<AuditTable>` is a 5-col grid (time, action, actor, target inquiry link, JSON `<details>`) with `tone-warn`/`tone-urgent` row tints from `audit-display.ts` so bounce/spam/escalate rows visually pop. New `apps/web/styles/audit.css` follows the kb/inbox grid pattern (`grid-template-columns: 150px 180px 1fr 140px 100px`). `<Tabs>` now takes `admin: boolean`; the layout reads `role` from `requireFirmContext` and conditionally appends the `監査ログ` tab — non-admins simply don't see it. **Out of scope this slice:** export to CSV/JSONL (Phase-2 along with S3 Object Lock WORM); inquiry-scoped audit timeline (filter by inquiry exists in the repo signature but no UI deep-link from inbox detail yet); per-actor audit insights/aggregates (count by action × actor cube); heatmap view of audit events. The current SQL queries are firm-id scoped and use the existing `(firm_id, received_at DESC)` index — no new indexes needed for pilot; revisit when any single firm exceeds ~1M audit events.
- **Team management UI (P2.8)**: ✅ Admins can now invite teammates, change roles, and remove members from inside Zeiro instead of the Clerk dashboard. All operations route through Clerk Backend API and rely on the existing `clerk-events.ts` webhook to sync state back into our `users`/`memberships` tables — Zeiro never writes to its own membership rows from these actions, so there's a single source of truth (Clerk) and the local DB just receives the eventual deltas. New `apps/web/lib/team.ts` wraps `clerkClient().organizations.getOrganizationInvitationList({ status: ['pending'] })` and exports `normaliseRole` (string → `'org:admin' | 'org:member'`) + `isAdminRole` shared helpers. New `apps/web/lib/team-guard.ts` (no `'use server'`, just shared module) holds: (a) `requireAdminFirm()` — composes `requireFirmContext` + `auth()` + `getFirm()` to return `{ ctx, organizationId, actorClerkUserId }` or a typed error; (b) `ensureNotLastAdmin(firmId, targetClerkUserId, newRole)` — only queries `countAdmins` + target membership when there's only 1 admin (cheap fast-path), denies if the operation would leave 0 admins; (c) `extractClerkError(e)` — pulls the first `errors[0].message` from Clerk's error envelope so the UI shows the friendly Clerk reason ("already a member", "email taken", etc.). Four server actions in `apps/web/app/(app)/settings/team-actions.ts`: `inviteMember` → `cc.organizations.createOrganizationInvitation({ inviterUserId, role, emailAddress })` so Clerk's invitation email shows the correct inviter; `changeMemberRole` + `removeMember` operate on the target's `clerkUserId` (passed via hidden form input from `<MemberList>`), reject self-targeting up-front, and run the last-admin guard before calling `cc.organizations.updateOrganizationMembership` / `deleteOrganizationMembership`; `revokeInvitation` calls `cc.organizations.revokeOrganizationInvitation({ requestingUserId })`. Each action records a typed audit row — `member.invited`, `member.role_changed`, `member.removed`, `invitation.revoked` — so the audit log explorer (P2.7) shows the full membership timeline. New repo extras: `listFirmUsers` now returns `{ id, clerkUserId, name, email, role, joinedAt }` (added clerkUserId + joinedAt for the table); `countAdmins(firmId)` for the guard. UI: `<TeamManagementSection>` is a single section that renders three blocks — current members table (`<MemberList>` with per-row role `<select>` + remove button, both posting to their own server action via independent `useActionState` hooks so one row's pending state doesn't block another), pending invitations table (`<PendingInvitations>`, hidden when empty), and the invite form (`<InviteMemberForm>`, email + role select + submit). Self-row hides the role-update and remove buttons entirely (defensive UX on top of the action-side guard). Settings page parallel-fetches the team data in the same `Promise.all` as channels/clients/etc., gated behind `admin`, and skips the Clerk invitation API call entirely for non-admins. New `apps/web/styles/settings.css` provides the `.member-table` + `.member-row` grid (5 cols for members, 4 for pending). **Out of scope this slice:** resend invitation (Clerk doesn't expose a direct API; admins re-invite if needed); custom email templates / branded invitations (Phase-2 with Clerk Customization API); audit-log filter shortcut "show this member's actions" (the explorer already supports actor filter, just no deep-link); SSO domain auto-provisioning; org-level guest roles. Removing a member doesn't tombstone their authored audit rows — by design, audit-log immutability per §5 means actions stay attributed to the original `actor_id` UUID even after the user leaves.
- **削除要求 (RTBF) flow + audit CSV export (P2.9)**: ✅ Closes the regulated-domain gap blocking pilot launch — APPI gives data subjects a right to deletion (個人情報の削除請求権), and 税理士法 §38 obliges the firm to honor it without destroying the audit trail. The existing `tombstoneClient(firmId, clientId, requestedBy, reason)` repo function (Phase-1 plumbing) does the right thing in a single transaction: replaces inquiry/draft `subject` + `body` with the literal `[削除済み]`, swaps the client row to `name='[deleted-{slug}]'` + `primaryEmail='deleted-{slug}@invalid'` + cleared `notes`/`metadata`, and writes a `client.tombstoned` audit row inside the same transaction so the immutability trigger doesn't see the audit insert as part of a rollback. New repo helpers in [client.ts](packages/db/src/repositories/client.ts): `searchClients(firmId, query, limit=10)` does a case-insensitive `ILIKE %q%` over `name + primary_email` + correlated `inquiryCount` so the admin sees impact before clicking; `getClientFootprint` exposes per-client counts (currently unused — kept for the planned Phase-2 "preview impact" enhancement). Two server actions in [tombstone-actions.ts](apps/web/app/(app)/settings/tombstone-actions.ts): `searchClientsForTombstone` returns a discriminated `{status: 'idle'|'results'|'error'}` state; `tombstoneClientAction` requires `clientId` (uuid), `reason` (≥10 chars), and a `confirm: 'on'` checkbox literal — all three must validate or the action returns the precise field error. Both gate on `isAdminRole`; non-admins get `'権限がありません (所長のみ)'`. UI is split into [TombstoneSection](apps/web/components/settings/tombstone-section.tsx) (search + result table + select) and [TombstoneConfirmForm](apps/web/components/settings/tombstone-confirm-form.tsx) (reason textarea + acknowledgment checkbox + double-friction destructive button styled with `var(--urgent)`). Success state replaces the form in-place with the count of tombstoned inquiries/drafts and a "process another client" reset button. **Audit CSV export** closes the P2.7 out-of-scope item: new GET route [/api/audit/export](apps/web/app/api/audit/export/route.ts) re-uses the explorer's filter parser (action / actor / window) and streams CSV via a `ReadableStream<Uint8Array>` — `listAuditEvents` paginates 500 rows at a time up to a 10k cap, encoded inline so a long export doesn't allocate the full result-set in memory. New `csv.ts` helper handles RFC-4180 quoting (escapes `"`, wraps cells with commas/newlines). The audit page header now has a "CSV エクスポート" `<a download>` carrying the same querystring, so what you see is what you export. Filename embeds firm-id slice + window + day (`zeiro-audit-{firmId8}-{window}-{YYYYMMDD}.csv`). System-actor rows render as `system` in the actor column; orphaned actor rows (user removed from firm) render as `(deleted)` — actor IDs themselves are preserved per the immutability rule. **Out of scope this slice:** S3 Object Lock WORM export (the manual CSV is the interim — Phase-2 nightly job will write the same format to S3 with `LegalHold`); JSONL format option for SIEM ingestion; pagination + size caps in the UI (currently the 10k limit is silent — Phase-2 surface a "truncated" indicator); preview-impact dialog before tombstone (currently the count comes from the search row, which can be stale by seconds — fine since the action re-reads inside the transaction); bulk-tombstone (one-at-a-time only, by design — admin friction prevents accidents).
- **PDF / Word knowledge ingestion (P2.10)**: ✅ Closes the onboarding gap — pilot firms keep their FAQs in Word and their tax-office handbooks in PDF, and the existing `/knowledge/new` flow only accepted plain text and `.eml`. New `apps/web/lib/knowledge-parser.ts` dispatches by extension and MIME to the right parser: `unpdf` (Mozilla pdfjs compiled for serverless — installs without native deps, runs in Node + edge) for `.pdf` via `extractText(uint8, { mergePages: true })` returning a single concatenated string + page count; `mammoth.extractRawText({ buffer })` for `.docx` (handles styled paragraphs, tables, headings — drops images and footnotes by design); existing `extractEmailText` for `.eml` / `.mbox`; raw UTF-8 for `.txt` / `.md`. Returns a typed `ParsedDocument` so the action can audit the parsed kind + page count. `ingestKnowledgeAction` now does `parseKnowledgeFile(file)` first, catches `ParserError` (unsupported extension or empty extracted text — typically image-only scanned PDFs) and surfaces it as a form error, then passes the extracted text into the existing `ingestKnowledge → chunkJapanese → embedDocuments → insertKnowledgeChunk` pipeline unchanged. The `isEmail` checkbox is gone (the parser knows from the extension). Audit metadata gains `parsedKind: 'text'|'email'|'pdf'|'docx'` and `pageCount?` so admins can spot-check what came through. Form's `accept` attribute updated to `.pdf,.docx,.txt,.md,.eml` and the help text mentions the OCR limitation explicitly so users don't waste time uploading scanned docs. **Out of scope this slice:** `.xlsx` / `.csv` (less common for FAQs, but `exceljs` would slot into the same dispatch — Phase-2); `.doc` (legacy binary — users convert to .docx first); image-only PDFs (Tesseract WASM OCR is a separate slice with a much bigger footprint); attachment text extraction on inbound email per F-03 (different pipeline, in-scope for the channels surface — the parser dispatch is reusable but `processInbound` doesn't call it yet); page-range / table-of-contents preservation (PDFs come out as a single flat string today — fine for short manuals, may want structured chunks for 100+ page handbooks).
- **Per-firm From + Reply-To (P3.2)**: ✅ Closes a multi-tenant correctness gap — outbound was using a generic `reply@${OUTBOUND_FROM_DOMAIN}` From, which meant a customer's reply landed at a single address shared across firms and `findFirmByInboundAddress` couldn't route it. Now `dispatchEmailReply` takes the full `firm` object, uses `firm.inboundAddress` (e.g. `inquiry-rin-tax@reply.zeiro.io` — auto-generated by the Clerk webhook on org creation, see `clerk-events.ts:defaultInboundAddress`) as both `From:` and `Reply-To:`. This way: customer sees `凜事務所 <inquiry-rin-tax@reply.zeiro.io>` in their inbox; clicks reply in Gmail → reply goes to `inquiry-rin-tax@reply.zeiro.io`; Resend's MX forwards to `/api/inbound`; `processInbound` does `findFirmByInboundAddress(toAddress)` → matches the right firm; `findDraftByOutboundMessageId(In-Reply-To)` threads the reply under the original inquiry via `parent_inquiry_id`; reviewer sees the full conversation history (P1.4's `walkThread`). The Message-ID outbound domain is also derived from `firm.inboundAddress` (split on `@`) so `<draftId@reply.zeiro.io>` matches what Gmail and other clients see in the From header — required for proper threading per RFC 5322. **Reply-To explicitly set:** even though the address is the same as From, setting `Reply-To` matches RFC 5321 best practice and prevents some webmail clients from inferring a different reply target. Threading already worked end-to-end via Message-ID chain (P1.4 plumbed it); this slice fixes the firm-routing piece. **Out of scope this slice:** custom-domain From (e.g. `inquiry@yamada-tax.jp` instead of `inquiry-yamada@reply.zeiro.io`) — that's P3.3 (Resend Domain Authentication wizard) which lets a firm verify their own domain via 3 CNAMEs and have outbound go from there; unverified firms continue to use the `reply.zeiro.io` subdomain fallback shipped here.
- **Resend migration (P3.1, ADR-9)**: ✅ Replaces SendGrid across the stack with Resend, the modern transactional alternative whose free tier (3k/mo + 100/day) actually works for pilot. New `packages/email/src/sender.ts` uses `Resend` from the `resend` SDK: `resend.emails.send({ from, to, subject, text, headers, tags })` with custom headers we own (`Message-ID`, `In-Reply-To`, `References`) and Resend tags (`{name, value}` array) carrying our idempotency + firm/inquiry round-trip keys. `SendResult` field renamed `sgMessageId → providerMessageId` (provider-agnostic). New `packages/email/src/parser.ts` exports `parseResendInbound(json)` that maps Resend's parsed-JSON inbound payload (Resend handles MIME parsing for us; supports both single-address strings and address objects) to our `IncomingMessage` schema — same target shape as the old `parseSendGridInbound`. New `apps/web/lib/resend-events.ts` parses Resend's webhook events (`email.sent` / `email.delivered` / `email.bounced` / `email.complained` / `email.failed` / etc.) and dispatches through the existing `findDraftByOutboundMessageId` (matches via the Message-ID header Resend echoes back) + reads `firmId` from the `tags` round-trip; the prior `findDraftBySgMessageId` was deleted. New routes: `/api/inbound` (Svix-signed, calls `parseResendInbound` then `processInbound`) and `/api/webhooks/resend` (Svix-signed, calls `applyEvents`). Both verifications use `svix.Webhook` (already in deps for Clerk; no new package). Env var rename: `SENDGRID_API_KEY` → `RESEND_API_KEY`, `SENDGRID_INBOUND_WEBHOOK_SECRET` → `RESEND_INBOUND_WEBHOOK_SECRET`, `SENDGRID_EVENT_WEBHOOK_PUBLIC_KEY` → `RESEND_EVENT_WEBHOOK_SECRET`. Dependencies: `@sendgrid/mail` and `@sendgrid/eventwebhook` removed; `resend` added. `packages/email` is the abstraction boundary so future provider swaps (AWS SES Tokyo for residency, Gmail OAuth for premium tier) are localised changes — `sendReply` + `parseInbound` signatures stay stable. **Out of scope this slice:** ISO-2022-JP edge cases through Resend's parsed-JSON inbound (we trust Resend's MIME parser; if a JP-encoding issue surfaces in pilot, we can add a custom processor or fall back to AWS SES Tokyo's raw-MIME-via-S3 flow); Resend's `tags` are limited to ASCII alphanumeric + `_-` and 256-char value cap (our keys are UUIDs so fine); Resend webhook retries up to 4 times over ~24h (idempotency via `data.email_id` + draft metadata).
- **Inbound attachment text extraction (P2.11, F-03)**: ✅ Closes the F-03 gap — when a client emails "添付の資料についてご質問" with a PDF attached, the agent now sees the document text and can answer in context. Reuses the P2.10 parser dispatch via a refactor: `parseKnowledgeFile(file: File)` is now a thin wrapper around the lower-level `parseDocument({ buffer, filename, mimetype })` so the same code path serves both authenticated knowledge ingest and unauthenticated inbound webhook attachments. New [inbound-attachments.ts](apps/web/lib/inbound-attachments.ts) iterates `message.attachments`, parses each, and builds an `AttachmentParseSummary { appendedText, parsed[], skipped[] }`. Caps: 5 000 chars per attachment, 30 000 chars total — once the total cap is hit, remaining attachments land in `skipped` with reason `'total-cap'` so the audit row still records them. Empty extractions (image-only PDFs, blank docs) → `'empty'`; unsupported types → `'unsupported'`; parser exceptions → the error message. The appended text uses a clear delimiter: `\n\n----- 添付: filename.pdf (3ページ) -----\n[text]` so reviewers and the LLM can tell where the attachment content begins. **PII masking after concatenation:** `processInbound` now combines `message.body + attachmentSummary.appendedText` *before* `maskMyNumber`, so My Numbers embedded inside attached PDFs/Docs get the same redaction treatment as the message body — important because tax docs are exactly where マイナンバー shows up. Audit `inquiry.received` metadata gains `attachments: { parsed, skipped, appendedChars }` for spot-checking which docs contributed context to a given draft. **Out of scope this slice:** OCR for scanned PDFs (Tesseract WASM is a separate slice — image-only PDFs land in `skipped` with `'empty'`); image attachment captioning (LLM-based vision is Phase-2); per-firm attachment size policy (currently global caps); LINE/web channel attachments (LINE images need separate fetch via Messaging API; web form has no upload field by design); attachment storage / retrieval beyond extracted text (we do not persist the raw attachment bytes — only the extracted text lands in `inquiry.body`, the rest is dropped after masking).
- **RAG**: single-stage cosine retrieval, no reranking, no citation enforcement, no refusal calibration.
- **Pipeline durability**: webhook calls agents synchronously. No queue, no retries, no observability.
- **Channels**: only email. No LINE, no web form. No adapter abstraction.
- **Knowledge ingestion**: no UI, no document parser, no re-embed pipeline, no freshness/version tracking.
- **Eval**: nothing. No golden set, no online metrics, no drift detection.
- **Outbound email**: not implemented at all (we only receive). When we add send, every "deliverability gotcha" research found applies.

---

## 1.5 Strategic positioning + Phase 3 plan (2026-05-10)

After P2.11, the product is technically pilot-capable but not pilot-ready: outbound email comes from `reply.zeiro.jp` (low trust signal for JP tax firms), runs only on localhost, and a brand-new firm sees an empty inbox with no guided onboarding. Phase 3 closes those gaps before pilot outreach.

### Dual-track GTM (the "polish so it serves both paths" model)

We're building toward two outcomes simultaneously, and the same engineering work serves both:

1. **SaaS pilot** — 3-5 design-partner firms paying ¥1M setup + ~¥40k/firm/mo, sourced via direct outreach (税理士会, 中小企業診断士 networks). Goal: case studies + product feedback in 3-4 months → unlock self-serve at ~¥30k/firm/mo year 2+.
2. **Consulting demo** — Zeiro as a portfolio piece showing end-to-end multi-tenant AI delivery in a regulated domain. Used to land ¥2-4M consulting engagements in adjacent regulated spaces (弁護士事務所, 行政書士, mid-sized banks).

The same things polish both: a deployed URL, a public demo workspace, a domain-authenticated outbound email path, an onboarding flow that produces "wow" in <5 minutes, and a 1-page architecture brief.

### Competitive position (why anyone uses ours)

No direct competitor for AI-first inbox / triage / cited-draft tooling specifically for Japanese tax firms. Adjacent: Zendesk / Front / Help Scout (English-first, not domain-aware), freee 税理士 / MFクラウド / TKC (filing automation, not customer comms), Karakuri / PKSHA (e-commerce chatbots). A firm could configure Front for ¥10k/seat/mo + 6 months of work to reach 30% of what we ship out of the box.

Defensible moat: domain-encoded triage rules (5 categories, 税務質問+判断要素 / 顧問契約 / 緊急キーワード always escalate), compliance shipped not configured (§38 守秘義務 + APPI + マイナンバー masking + 5-year audit immutability), Japanese-native plumbing (ISO-2022-JP, Sudachi planned, JP-tuned rerank), cited drafts with refusal calibration, and a per-firm KB that compounds in value as approved replies auto-add (P2.1).

### Email provider strategy (the pillar that drives the next slice)

Three-stage migration matched to tier and scale:

**Stage A — Pilot (now, Phase 3):** Resend for outbound + inbound. Reasons: SendGrid's 2024 free-tier collapse (100/day, useless) and aging API; Resend has a viable free tier (3k/mo), modern SDK, native domain authentication wizard, and inbound parsing. Same RFC-5322 threading model as SendGrid so all our `Message-ID` / `In-Reply-To` plumbing transfers as-is. Like-for-like swap behind `packages/email`.

**Stage B — Premium tier:** Gmail OAuth (Google Workspace) as a **second** channel adapter alongside Resend. Firms on Workspace (~70% of JP tax firms) connect their actual mailbox via OAuth (`gmail.send` + `gmail.readonly` scopes); outbound goes through Gmail API → emails appear in their actual Sent folder, customers see real `partner@firm.jp` with no `via` warning, data stays in their Workspace (strong §38/APPI alignment). Inbound via Gmail watch + Pub/Sub push notifications. Roughly a week's build. Per-user OAuth (Workspace admin can pre-authorize).

**Stage C — Production residency:** Migrate Resend → AWS SES Tokyo when residency hardens from "we'll handle it in onboarding" to a hard requirement. SES Tokyo keeps mail bodies in Japan; inbound moves from Resend's webhook to S3 + Lambda. Same `InputAdapter` / `ReplyAdapter` interface (§4.1) so the workflow is unchanged.

### Threading model (universal across providers)

RFC 5322's `Message-ID` + `In-Reply-To` + `References` chain works on every provider; we already use it. Each outbound message gets `Message-ID: <draftId@<firm-domain-or-zeiro>>`, replies carry `In-Reply-To: <originalMessageId>` and a chained `References`, and inbound `findDraftByOutboundMessageId` parses headers to set `parent_inquiry_id`. The thread view (P1.4 `walkThread`) renders the chain on detail page.

Per-provider extras:
- **Resend / SES:** raw MIME we control entirely — set headers explicitly.
- **Gmail OAuth:** same headers, plus pass `threadId` to Gmail's `users.messages.send` so Gmail UI shows the thread correctly (we'll store `gmailThreadId` in `drafts.metadata` on first send, reuse on subsequent).
- **LINE:** no RFC-5322 — uses our own `parent_inquiry_id` chain via the LINE message-id, identical pattern.

Reviewers see a single conversation history regardless of channel.

### Phase 3 sequenced plan (3 weeks)

Goal: from "works on localhost" to "first pilot firm signs up + sees value in <10 minutes."

**Week 1 — provider migration + domain auth (the "looks professional" pass)**
- **P3.1** Replace SendGrid with Resend in `packages/email` (sender + inbound webhook + event webhook). Same interface; one day's work behind the existing abstraction. New ADR.
- **P3.2** Reply-To plumbing + per-firm `From:` subdomain fallback (`凜事務所 <inquiry-rin@reply.zeiro.jp>`) for firms not yet domain-verified. ~2 hours.
- **P3.3** Resend Domain Authentication wizard. Settings UI: paste domain → 3 CNAME records with copy buttons → `Verify` polls Resend's status API → green checkmark → `From:` swaps to `<inquiry@firm-domain.jp>`. Audit `channel.configured { channelType: 'email_domain', domain, status }`.

**Week 2 — Gmail OAuth as second channel + onboarding (the "premium tier" pass)**
- **P3.4** `email-gmail-oauth` channel adapter. OAuth flow with `gmail.send` + `gmail.readonly` scopes; encrypted refresh-token storage in `firm_channels.config`; outbound via `users.messages.send` with raw MIME we generate; inbound via Gmail watch + Pub/Sub notifications; `gmailThreadId` stored in `drafts.metadata`. Settings UI: "Send via Google Workspace mailbox" toggle, list of connected staff users. ~4 days.
- **P3.5** Onboarding checklist for first-run admin: 4 cards (upload first FAQ → connect domain or Workspace → invite teammates → submit a test inquiry); cards disappear when done. ~2 days.

**Week 3 — demo + deploy + marketing (the "go to market" pass)**
- **P3.6** Public demo workspace. Read-only `/demo` URL with seeded firm + sample inbox + KB. Anyone can browse without sign-up. Critical for both SaaS sales (firms see it before signing up) and consulting (linked from portfolio). ~2 days.
- **P3.7** Production deploy. Vercel (web) + Railway/Render (agents) + Neon (DB) + Resend prod keys + Clerk production tier with `app.zeiro.jp` custom domain + Inngest production. Flush prod-specific issues (build size, cold starts, Clerk middleware, DNS). ~1 day.
- **P3.8** Marketing site at `zeiro.jp`: problem statement, 3 screenshots, pricing intent (`¥1M setup + ¥40k/firm/mo, 5 pilot slots`), contact form. Single-page Next.js. ~1 day.
- **P3.9** Bug bash + 1-page architecture brief for consulting prospects + 1-page sales deck for firms. ~1 day.

**After P3.9 → pilot outreach.** First pilot's feedback rewrites the roadmap better than any plan written in advance.

### Explicitly NOT in Phase 3

Tempting features that we defer because they don't unlock pilot value:
- More AI quality (Voyage-3 embeddings, Sudachi tokenization) — current RAG is good enough; we don't yet know which firms hit the quality ceiling.
- Stripe billing — manual invoicing handles 5 firms.
- Private/on-prem deployment — solve when first enterprise asks.
- Reviewer keyboard shortcuts — nice-to-have, not blocking.
- Slack / MS Teams channels — wait until a firm asks.
- Eval golden set with 100+ cases — build it from a pilot's actual data, not synthetic.

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

### ADR-9: Resend over SendGrid for transactional email (resolved 2026-05-10)
**Decision:** Replace SendGrid with Resend for both outbound (`sendReply`) and inbound (Inbound webhook) for the pilot stage. Keep `packages/email` as the abstraction boundary so future provider swaps (AWS SES Tokyo for residency, on-prem SMTP for enterprise) are localised. Supersedes ADR-1 + ADR-2's "SendGrid" specifics; the underlying decisions (managed transactional provider, MIME we own, RFC-5322 threading) carry over unchanged.
**Rationale:** SendGrid's free tier collapsed in 2024 (now 100/day, useless for pilot or developer-tier signup); their API SDK has aged; Inbound Parse requires raw-MIME mode (we already work around that). Resend was founded by ex-SendGrid people, has a viable free tier (3k/mo + 100/day), modern SDK, native domain authentication (3 CNAMEs, like SendGrid's whitelabel), inbound parsing now GA, RFC-5322 threading is identical. Migration is contained to `packages/email/sender.ts` + the inbound webhook route + env vars.
**Trade-off:** Resend is US-only — same data residency profile as SendGrid (mail bodies transit US). Not worse than what we had. **Phase-2 migration plan to AWS SES Tokyo** stays queued as the residency-hardening step (covered by ADR-1's same migration narrative — different provider name, same `InputAdapter` interface).
**Why not Postmark / Mailgun:** Postmark has no free tier (paid-only from day 1, painful for dev iteration); Mailgun's pricing entry is $35/mo and the SDK is dated. Resend is the modern equivalent with the right pricing curve for pilot stage.
**Why not jump straight to SES Tokyo:** SES inbound requires S3 + Lambda glue (~3-4 days work) and SES production access requires a 24-48h+ approval queue. We'd burn a week of pilot momentum. Resend is same-day.
**Threading guarantees:** Resend respects custom `Message-ID` headers in raw outbound + includes them in inbound webhooks unchanged, so all our P1.2 thread plumbing (`findDraftByOutboundMessageId`, `walkThread`) is unmodified.
**Phase-2 add-on:** Gmail OAuth as a **second** adapter (ADR-10) for firms on Google Workspace who want emails to go from their own mailbox.

### ADR-10: Gmail OAuth as premium-tier second channel adapter (queued, Phase 3 mid)
**Decision:** Add `email-gmail-oauth` channel type alongside `email-resend`, selectable per-firm in settings. Resend remains the default and the path for firms not on Google Workspace.
**Rationale:** ~70% of JP tax firms run Google Workspace. OAuth-connected sending makes emails go from the firm's actual Gmail account — appears in their Sent folder, customers see real `partner@firm.jp` with no `via reply.zeiro.jp` warning, mail content stays in the firm's Workspace (strong §38/APPI alignment, since data is already in their controlled mailbox). This is what Front Premium / Missive / Superhuman do.
**Trade-off:** Per-user OAuth (each sender consents; Workspace admins can pre-authorize for the org). Two inbound paths to maintain (Resend webhook for Stage A firms, Gmail watch + Pub/Sub for Stage B firms). Bigger build (~1 week).
**Threading:** Gmail respects raw-MIME `Message-ID` / `In-Reply-To` we set, plus we pass `threadId` to `users.messages.send` so Gmail UI threads correctly. `gmailThreadId` stored in `drafts.metadata` on first send, reused on replies.
**Pricing leverage:** Premium tier feature. Justifies pricing differentiation between basic (Resend) and premium (Gmail OAuth) plans.

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

### Phase 3 — Pilot launch (3-week sprint, see §1.5 for sequenced plan)

The "GA" label was a placeholder during planning. What Phase 3 actually means right now is "polish + deploy + acquire first pilot." Detailed week-by-week sequence lives in §1.5. Slices summary:

- **P3.1** Resend migration (ADR-9) — replaces SendGrid in `packages/email`.
- **P3.2** Reply-To plumbing + per-firm From subdomain fallback.
- **P3.3** Resend Domain Authentication wizard (settings UI + DNS records + verify polling).
- **P3.4** Gmail OAuth channel adapter (ADR-10) — second adapter alongside Resend, premium tier.
- **P3.5** First-run onboarding checklist (4-step admin flow).
- **P3.6** Public demo workspace at `/demo`.
- **P3.7** Production deploy (Vercel + Railway/Render + Neon prod + Resend prod + Clerk prod-tier).
- **P3.8** Marketing site at `zeiro.jp`.
- **P3.9** Bug bash + 1-page architecture brief + sales deck.

### Phase 4 — Post-pilot expansion (deferred, after first 3-5 firms)

Driven by what pilot firms ask for, NOT by speculation:

- AWS SES Tokyo migration for residency hardening (queued from ADR-1 since Phase 1).
- freee / MFクラウド read-only integrations (per requirements §10).
- Slack / MS Teams channel adapter.
- Voicemail-to-inbox (Twilio + Deepgram).
- Multi-region failover (Tokyo primary + Osaka warm).
- Stripe billing (per-firm-per-顧問先).
- Eval golden set built from pilot's actual data; Mastra evals in CI.
- RAG quality upgrades (Voyage-3 embeddings, Sudachi tokenization) — only if pilot data shows current RAG hits a ceiling.
- Reviewer keyboard shortcuts + per-inquiry assignment dropdown.
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
