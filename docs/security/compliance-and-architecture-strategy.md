# Zeiro Security, Compliance & Multi-Tenancy Strategy

*Principal-engineer synthesis for the founder — 2026-05-31. Verified against the repo (single contributor, 84 commits; agents on Render Singapore free tier per `render.yaml`; no `.github/workflows`; OAuth callback trusts unsigned state; tombstone doesn't touch the RAG store).*

> **Editor's note (post-migration correction):** the synthesis read the now-stale `render.yaml`. The agents service was **migrated to Google Cloud Run (Tokyo, `asia-northeast1`, 2 GiB)** — it is no longer on Render, no longer OOMing, and **compute already sits in jp-tokyo**. That narrows the residency gap (§7.1 / roadmap #10, #17) to the **Neon Postgres DB (Singapore)** plus the transit/LLM/subprocessor paths, and the subprocessor register should list **Cloud Run (GCP)** instead of Render. `render.yaml` is superseded (delete it). Everything else stands.

---

## 1. Executive Summary

**Thesis: You have a stronger *engineering* baseline than almost any 1-person pre-pilot SaaS — append-only audit trigger, disciplined `firmId`-first repositories, AES-256-GCM token encryption, PII masking, Sentry scrubbing. What you do *not* have are (a) three concrete security/legal *bugs* that are dangerous regardless of any certification, and (b) a governance/evidence layer. The single biggest mistake you could make right now is to treat "get SOC 2" as the goal. SOC 2 is a *sales artifact you produce when a buyer demands it.* The defects below are real and stand on their own merits — fix them now; start the audit paperwork only when a deal requires it.**

**The single biggest architectural decision: keep app-layer `firmId` filtering as the *primary and only mandatory* tenant-isolation gate — do NOT adopt Postgres RLS as a blanket, transaction-wrapped backstop on the Neon serverless driver.** The honest verdict (Section 2) is that a blanket `forFirm()` RLS extension is the most over-engineered idea in the whole research set for *this* stack and team: it would force an `AsyncLocalStorage` rewrite touching 225 files, wrap every read in an interactive transaction (Prisma's own closed-"not planned" footgun #23583), add pooled-WebSocket pressure on a free-tier box that already OOMs, and *still* wouldn't cover the Mastra `mastra` schema where the actual email-body content lives. Instead, the defense-in-depth that is cheap, stack-correct, and auditable is: **(1) a CI grep/Semgrep gate asserting every repository export takes `firmId` first and no raw `$queryRaw` omits a `firm_id` predicate; (2) signing/binding `firmId` at every trust boundary that currently trusts a tamperable value; (3) RLS introduced *narrowly and later*, only on the ~10 hand-written raw-SQL tables, GUC set once per request.**

The three defects to fix **this week**, in order:
1. **OAuth tenant-bind hole** — `completeOAuthFlow({code, state})` trusts `firmId` decoded from plain `base64url(JSON)`. The callback isn't public (Clerk session is present) but never checks it. One line — `state.firmId === ctx.firmId` — closes a cross-tenant freee-binding break (§38).
2. **Live plaintext secrets** — `.env.production` holds a live Anthropic key + Neon password on the laptop. Rotate, scan git history, delete.
3. **RTBF leaks client data** — `tombstoneClient` redacts inquiries/drafts/client rows but leaves the auto-added RAG chunks (which contain the client's own words + embedding) retrievable, plus raw email headers and freee bindings. Verified cheap to fix (chunks already carry `metadata.documentId = inquiry.id`).

The residency violation (Singapore DB + Singapore agents, zero jp-tokyo LLM calls) is real but is a **decide-now, migrate-next** item, not a same-week blocker — and the email/LLM-trace transit path leaks cross-border on *every* message regardless of where Postgres sits, so it must be ranked alongside the DB move.

---

## 2. Target Architecture — Multi-Tenancy Isolation Model

### 2.1 The model (keep it)

Zeiro is a **pooled shared-DB multi-tenant model with a `firm_id` discriminator and application-layer isolation.** This is the correct industry-standard target (AWS SaaS Factory, Nile, Supabase) for a team selling to 50-300-seat firms. **Reject** DB-per-tenant and schema-per-tenant — they multiply migration/connection/Neon-branch overhead with zero confidentiality benefit at your scale. The research and both critiques agree; this is settled.

The trust chain today:

```
Clerk org (= firm = tenant)  →  requireFirmContext() derives firmId
   →  repository fn(firmId, …)  →  WHERE firm_id = $1   [ONLY enforcement layer]
```

### 2.2 The Neon-serverless-RLS verdict

**Do not adopt blanket, transaction-wrapped RLS.** The mechanism the research proposes (a `forFirm()` Prisma client extension wrapping *every* model op in an interactive `$transaction` that runs `set_config('app.firm_id', …, true)`) is technically *sound in isolation* — transaction-local GUC over the WebSocket pool is the only way RLS works on Neon, and plain session `SET` would cause the Nile-style cross-tenant leak. But for this codebase it is the wrong call, for four verified reasons:

1. **No client threading exists.** All 19 repos call a module singleton `getPrisma()`; 225 files import `@zeiro/db`. To make `forFirm()` *enforcing* (not opt-in) you must make the unscoped client unreachable — i.e. an `AsyncLocalStorage` ambient store seeded in `requireFirmContext()` + every webhook/channel/Inngest resolver. That is a load-bearing rewrite the research never names.
2. **"Wrap every op in `$transaction`" is a known Prisma footgun** (issue #23583, closed *not planned*): nested/separate transaction scopes, each holding a pooled Neon WS slot for the op's duration — material latency/pool pressure under serverless concurrency, on a box that already OOMs.
3. **It doesn't cover the most sensitive data.** `apps/agents/src/mastra/storage.ts` puts thread/message/working-memory — *actual confidential client email bodies* — in the `mastra` schema via its own `@mastra/pg` pool, not Prisma. RLS on `public` plus a Prisma extension touches none of it.
4. **The real leak surface is ~10 hand-written `$queryRaw` helpers**, not the 90% of code already going through type-safe `where({ firmId })`.

### 2.3 Defense-in-depth (the realistic version)

| Layer | Control | Status / action |
|---|---|---|
| **L1 — Identity** | Clerk org → `firmId` binding is the isolation *trust root* | **Name it as a control.** Verify the Clerk-org→firmId derivation in `requireFirmContext()` is the *only* source of firmId for user paths; never read it from headers/query/body. |
| **L2 — App (primary gate)** | `firmId`-first repos + `requireCan`/`viewerScope` | **Codify as a CI gate** (Semgrep/lint/test): every repo export takes `firmId` first; no `$queryRaw`/`$executeRaw` lacks a `firm_id` predicate. Turns existing discipline into evidenced CC6.1. |
| **L3 — Boundary binding** | Sign `firmId` everywhere it's currently tamperable | Agents endpoint (`c.req.query('firmId')`), agent-client body (unsigned), OAuth `state.firmId`, `/api/channels/line/[firmId]`, `/api/channels/chatwork/[firmId]`. Mint a short-lived HS256 `{firmId, inquiryId, exp}` in web; verify + throw `TenantIsolationError` on mismatch. |
| **L4 — DB backstop (LATER, narrow)** | RLS on raw-SQL tables only | Enable + **FORCE** RLS, run as a non-owner non-`BYPASSRLS` role, set `app.firm_id` via transaction-local `set_config(…, true)` **once per server action** (not per op). `knowledge_chunks` policy: `USING (firm_id = current_setting('app.firm_id',true)::uuid OR scope='global')`. Start with the ~10 hand-raw tables. |
| **L5 — Mastra schema** | Decide explicitly | Email bodies live in `mastra` (own pool). Choose: signed-firmId-at-boundary + `memory: { thread: inquiryId, resource: firmId }` keying (cheap, do now), and document RLS-on-the-Mastra-pool as a Later option. An auditor *will* ask where the email bodies are; the answer cannot be "unsigned query param, no backstop." |

**Tests:** Stand up **Vitest only** against the Docker pgvector instance (CLAUDE.md forbids DB mocks): seed firm A + B, table-driven assertion that every exported repo fn never returns B's rows; ship-blocking. **Defer pgTAP to Later** — a second toolchain for marginal coverage on a team with no test infra today.

OSS to copy *patterns* from (not deploy):
- [aws-samples/aws-saas-factory-postgresql-rls](https://github.com/aws-samples/aws-saas-factory-postgresql-rls) — policy shape, "app role must not own tables / must not have BYPASSRLS" rule (your FORCE-RLS need).
- [prisma/prisma-client-extensions/row-level-security](https://github.com/prisma/prisma-client-extensions/tree/main/row-level-security) — the `set_config(…, TRUE)` pattern, **adapted away from per-op wrapping** (set once per request).
- [Nile multi-tenant RLS write-up](https://www.thenile.dev/blog/multi-tenant-rls) — the cautionary tale that justifies "never session `SET`, always transaction-local" in code review.

---

## 3. The SOC 2 Path (Type I → II)

**Reframe: SOC 2 is buyer-triggered, not calendar-triggered.** You are a pre-pilot solo product with an unmerged v1 branch and an agents service that OOMs on a 512 MB box. Do not spend the "now" budget on audit paperwork. Do the security/legal fixes in Sections 2, 6, 7 *on their own merits now*; start the program when a 税理士法人 deal demands it.

When triggered:

- **Scope: Security (Common Criteria, mandatory) + Confidentiality only.** Exclude Availability (single-region, known OOM — you can't evidence an SLA/DR regime), Processing Integrity (for transaction systems, not a human-reviewed drafting tool), and Privacy-the-TSC (covered via APPI + Confidentiality). This is exactly the pairing 守秘義務 §38 buyers care about, and it minimizes controls to evidence. ([Schellman TSC guidance](https://www.schellman.com/blog/soc-examinations/soc-2-trust-services-criteria-with-tsc))
- **Platform: use a HOSTED compliance tool, do NOT self-host.** A solo operator proving they can run securely should not stand up *another* production service (DB, upgrades, backups, its own attack surface) to track their compliance. The research's "self-host keeps compliance data jp-region" argument is weak — compliance metadata isn't §38 client PII. Use **comp.ai cloud** or a startup-discounted **Vanta/Drata**. Keep [comp.ai (trycompai/comp)](https://github.com/trycompai/comp) and [Probo (getprobo/probo)](https://github.com/getprobo/probo) as *template libraries* — and [getprobo/awesome-compliance](https://github.com/getprobo/awesome-compliance) for control-to-evidence mappings — even if you don't run them. Probo is the better template base if you later want ISO 27001 from the same evidence.
- **Skip the separate paid readiness engagement** — use the platform's free gap analysis. Engage a CPA for Type I (point-in-time, sellable in weeks) → run a 3-month observation window → Type II.
- **Endpoint: a static FileVault-on + screen-lock + 1-page endpoint policy attestation is sufficient for n=1.** Do not stand up a device agent / MDM "fleet" for one laptop.
- **Realistic numbers:** platform ~$7.5-12k/yr (or comp.ai cloud cheaper), Type II audit ~$15-30k for the narrow scope, ~100-200 internal hours — but **3-4 months part-time**, not 6-8 weeks, given you're still shipping product.

**First policies (8-10, from platform templates, adapted):** InfoSec; Access Control (map to `membership.appRole`/`can_send`/`client_scope`); Change Management (point at the new CI); Incident Response (run a tabletop — auditors want evidence one happened); Vendor/Subprocessor Mgmt + the live register (Section 7); Data Classification + Retention/Disposal (RTBF + 5-yr audit, Section 4/7); BCP/backup (Neon PITR — *verify it's enabled*); Risk Assessment + register; Acceptable Use/Endpoint; SDLC/secure-dev. **Baseline tech controls auditors fail startups on:** SSO+MFA (hardware key) on *every* admin console, full-disk encryption, a documented *quarterly access review that actually happened*, and a vuln-remediation SLA.

---

## 4. Audit & Evidence Design

The audit trail is the crown jewel — append-only DB trigger, typed `auditActionEnum`, `recordAudit` chokepoint. It is "append-only by convention," not "tamper-evident by cryptography." Close the gap *cheaply* and avoid the over-engineered parts.

**Do now (cheap, high-leverage):**

1. **Lock down the real tamper vector first: Neon branch reset / PITR.** An in-DB hash chain *self-heals* across a point-in-time restore — so the highest-leverage controls are near-free *process* controls: **hardware-key MFA on the Neon org, restrict who can PITR/reset branches, and write a daily chain-head digest to a table the runtime role can't rewrite.** This beats building the chain itself. (The research buried this.)
2. **Widen the canonical schema:** add `source_ip`, `user_agent`, `request_id` (ULID from middleware), first-class `target_type`/`target_id`, and `reason` — captured in `firm-context.ts` via `headers()` (it reads none today). Cheapest CC6/§38 incident-response win; unblocks "who did what to which record, from where, why." `request_id` ties events to Sentry/traces.
3. **SHA-256 hash chain — but built ASYNC, not in the insert trigger.** A `BEFORE INSERT` trigger doing `SELECT … FOR UPDATE` injects a per-firm serialization point into every user-facing mutation's hot path on the serverless driver. Instead: add `seq` (**global `BIGSERIAL`**, not per-firm yet), `prev_hash`, `row_hash`; build the chain via a **single-writer Inngest job** (Inngest is already wired). **Critical:** compute the hash preimage from an **application-controlled canonical JSON string**, *not* Postgres `jsonb::text` (unstable across Neon engine upgrades — would false-positive the whole chain). `pgcrypto` is already installed if you want `digest()`. Ship a one-time documented genesis/backfill ceremony for existing rows.

**Do next:**
4. **Migrate the app onto a least-privilege DB role** (INSERT+SELECT on `audit_events`, no UPDATE/DELETE/TRUNCATE, not in `neon_superuser`/no `BYPASSRLS`); DDL via a separate CI migrate role. **This is the control that actually closes the hole** — the trigger is bypassable by `TRUNCATE` (doesn't fire row triggers) and `DISABLE TRIGGER` today. Re-sized from S to **M** (regression risk moving every write off superuser).
5. **Evidence-grade export:** the export route is a stub (`MAX_ROWS=10_000`, no `recordAudit`) and `audit.exported` isn't in the enum. Emit a JSON manifest beside the CSV (firmId, window, row count, first/last seq, chain head hash, SHA-256 of CSV bytes, exporter, `verifyAuditChain` result) and record `audit.exported`.

**Do later:** `verifyAuditChain` walking seq order nightly (Sentry + owner alert on break, with defined behavior at the genesis/backfill boundary); mirror key Clerk auth/membership/MFA events into `audit_events` (Clerk webhook is already public); audit *reads* of sensitive data (you have `integration.freee_data_accessed`; add human reads of inquiry bodies + the `audit.view` action itself). Scope the N-05 claim as **"tamper-evident, 電子帳簿保存法-*equivalent intent*"** pending legal sign-off — accredited TSA タイムスタンプ is the likely follow-on question.

**Cut as over-engineered:** per-firm `seq` + per-firm advisory locks (use one global `BIGSERIAL`); external S3/GCS Object-Lock anchoring *before* the residency move is done (a separate-table digest + Sentry/email suffices until an auditor is engaged); Trillian/Signed-Tree-Head ceremonies; immudb as a second datastore; typed before/after diff columns (metadata JSONB already carries tombstone reason / role changes).

Patterns to borrow: [AuditKitDev/auditkit](https://github.com/AuditKitDev/auditkit) (closest stack match — event shape, hash-chain, tenant-isolated trails, export manifest), [codenotary/immudb](https://github.com/codenotary/immudb) (*concept* of per-entry hash + periodic head digest), [pgAudit](https://github.com/pgaudit/pgaudit) (*mindset* — log DDL/privileged ops as their own stream), [Crosby & Wallach tamper-evident logging paper](https://static.usenix.org/event/sec09/tech/full_papers/crosby.pdf) (justifies tamper-*evident* + privilege-restriction vs claiming impossible perfect immutability).

---

## 5. Observability & Logging (PII-Safe) — the Cheap Stack

Because **no log sink can be jp-tokyo-resident** (Axiom edge = US/EU, Sentry has no Tokyo region), **redaction at the boundary is the load-bearing §38 control** — not an afterthought. Today there's error tracking (Sentry, both services) but no structured log pipeline, no correlation IDs, no uptime monitoring, and the agents Sentry scrubber is weaker than web's (misses `breadcrumb.data` + request bodies).

**Now ($0):**

1. **One pino logger in `@zeiro/core`** (NOT a new `packages/observability` — that risks a `core ↔ observability` circular dep and violates the "PII utils live in core" rule). Configure `redact` with `remove: true` for content keys (`*.body`, `*.subject`, `*.sentBody`, `email`, `myNumber`, `authorization`, `cookie`, `token`, `secret`). Run the recursive `redactPIIDeep` net **only on warn/error** (not every info log — it's a full recursive regex walk that defeats fast-redact on the hot path). Replace the 4 real `console.*` (esp. `apps/agents/src/server.ts:29` dumping raw `reason`) and flip `biome.json` `noConsole` from `warn` → `error` (one line). ([pino redaction docs](https://github.com/pinojs/pino/blob/main/docs/redaction.md))
2. **Unify the redactor across pino + both Sentry sinks + Mastra.** Bring the agents `beforeSend` to web parity. Strengthen `mask.ts`: add JP mobile (`0[789]0` with/without hyphens), treat inquiry/draft body+subject as redact-*by-key* (drop, don't regex). Add a JP-PII unit-test corpus. **Verified narrowness:** only `maskMyNumber` runs before LLM calls — `redactPII` (names/email/phone) does *not*, so client names/financials reach the LLM today. The "we mask PII before the LLM" story is My-Number-only; tighten it or scope the claim honestly.
3. **Thread a plain `requestId` (UUID, not W3C traceparent)** across web → Inngest → agents. Mint at the inbound boundary, attach via pino child `{requestId, firmId}`, add to every Inngest payload, send as `x-request-id` on the web→agents call with a Hono middleware. `AsyncLocalStorage` for ambient access (this also seeds the L3/L5 isolation work).
4. **Close the Inngest + inbound-webhook client-content leaks** (the research's blind spot, arguably bigger than the Sentry path): Inngest captures function payloads/step output in its **US-hosted dashboard** independent of your pino stream. Minimize what enters Inngest events/steps — pass IDs, refetch content *inside* the step, don't *return* draft/analysis text from steps. Never log the raw email body in the `/api/inbound` (Svix) handler. **Explicitly forbid Prisma `log:['query']` in prod** (it prints bound values — names, emails — bypassing every redactor).
5. **Uptime + the live OOM alert:** UptimeRobot free (or BetterStack free) against agents `/api/health` and a web health route, plus an alert on the **Render 512 MB OOM/restart** (the real operational pain) and Inngest failure rate → **one Slack channel** (resolves the open エスカレーション通知 question). Skip error-budget/burn-rate SRE math until paying users.

**Later (audit-triggered):** centralized aggregator — only when the Type II window starts. Pick the cheapest OTel-native option then (**Axiom** free 500 GB/30-day, or **BetterStack** if you want logs+uptime+on-call bundled). Keep the 5-yr §38/電帳法 record in Postgres `audit_events`, **never** the log vendor. **APPI/RTBF tension the research missed:** design logs to contain *no* client-identifying content so a 削除要求 doesn't have to chase a US log SaaS. **Full distributed OTel** ([@vercel/otel](https://github.com/vercel/otel), OTel Node SDK in Hono, [Inngest Extended Traces](https://github.com/inngest/inngest-js)) is genuinely optional — the plain `requestId` buys ~90% of investigative value, and a second OTel SDK in the agents process risks double-instrumentation conflicts with Mastra's existing `@mastra/observability` exporter. The auditable deliverable here is the **runbook** (logging/monitoring policy, incident-response severity + alert→ticket flow, quarterly log-review record), not tooling. Keep LLM cost/quality in [Langfuse](https://github.com/mastra-ai/mastra) — **but self-host it in Tokyo or disable in prod**, since it captures full prompts (= client content, only My-Number masked). [Grafana Loki](https://github.com/grafana/loki) only if SaaS residency becomes a hard blocker (you'd operate it — last resort).

---

## 6. Secrets, Encryption & Supply-Chain Hardening

**Now (this week):**

1. **Rotate everything in `.env.production` and scan history, then delete it.** Verified: it holds a live `sk-ant-api03` key + Neon password. Treat as compromised. Rotate the Anthropic key, the Neon role password, **and every webhook-signing secret** the research omitted — `INNGEST_SIGNING_KEY`, `RESEND_*_WEBHOOK_SECRET`, `CLERK_WEBHOOK_SECRET` — because those guard the *unauthenticated* `/api/inbound` + `/api/webhooks/*` routes (forged inbound client email is arguably higher-impact than a leaked LLM key). **Scan full git history** (`git log --all -p -- '*.env*'`, [gitleaks](https://github.com/gitleaks/gitleaks) `--log-opts`) — the team had a prior `.env` leak — and confirm nothing inlined into `.next` bundles.
2. **Close the OAuth tenant-bind hole with a `firmId`-match check** (cheapest correct fix; the research over-specified it). Verified: the callback is *not* in `isPublicRoute`, so a Clerk session is present but unused. In the callback, call `requireFirmContext()` and reject unless `state.firmId === ctx.firmId`. That alone stops the cross-tenant freee bind. *Then* HMAC-SHA256-sign the state payload (protects the PKCE `codeVerifier`) as a smaller second layer — don't block on it. The cookie-nonce is belt-and-suspenders, optional once the match lands.
3. **gitleaks as a LOCAL pre-commit/pre-push hook first** (husky/lefthook), then the CI gate. The team's failure mode is committing `.env`; a CI-on-PR scan fires only *after* the secret is on GitHub.
4. **Document secrets on the EXISTING platforms** — Vercel encrypted env (web) + Render dashboard env (agents). **Do NOT stand up GCP Secret Manager yet** — verified the repo deploys agents to **Render** (`render.yaml`, `region: singapore`), not Cloud Run, so the "you're already on GCP" argument is false. One-page inventory: each of the ~24 secrets, where stored, owner, rotation cadence (90d API keys, on-incident for webhook secrets + `ENCRYPTION_KEY`). Pick a canonical manager only *after* the platform/residency decision.

**Next:**

5. **CI security pipeline** (`.github/workflows`): [gitleaks](https://github.com/gitleaks/gitleaks) + [OSV-Scanner](https://github.com/google/osv-scanner) (or `pnpm audit --audit-level=high`) + **CodeQL** (free SAST for private repos) + Biome lint + `tsc` as a branch-protection gate on `main`. **Pin every action to a full commit SHA** (the tj-actions/changed-files 2025 incident was floating tags) and set `permissions: contents: read`. Add [Renovate](https://github.com/renovatebot/renovate) (keeps deps *and* action SHAs current, respects "pin to latest stable"). Document self-review-on-PR as the compensating control for a solo dev. **Skip [StepSecurity Harden-Runner](https://github.com/step-security/harden-runner) for now** (premature for a 2-person repo). This is your CC8.1/CC7.1 evidence.
6. **Add a key-version prefix (`v1:`) to the encryption format** so rotation is possible — and land it **before any rotation** (else the first `ENCRYPTION_KEY` rotation is a breaking outage across web + agents + the freee seed script, which all share the static key). **Do NOT build per-firm/per-row DEK envelope encryption + Cloud KMS now** — that's premature crypto-engineering for a handful of read-only, *re-issuable* freee/Chatwork tokens behind a 20-事業所 cap (revoke + reconnect is the cheap compromise mitigation). KMS-wrap the *single* app key only if/when you migrate to GCP.

**Later:** digest-pin `node:22-slim` in the `Dockerfile` (one line — verified floating today). SBOM/Trivy is genuinely last (no tax-office pilot asks for an SBOM; `.gcloudignore` already keeps secrets out of the image). Encryption + subprocessor posture doc (Section 7).

OSS: [gitleaks](https://github.com/gitleaks/gitleaks), [OSV-Scanner](https://github.com/google/osv-scanner), [Renovate](https://github.com/renovatebot/renovate), [Trivy](https://github.com/aquasecurity/trivy). **Skip [Infisical](https://github.com/Infisical/infisical) self-host** — another service for a solo operator; the native platform stores are lower-ops.

---

## 7. Data Privacy, Residency, RTBF & Subprocessor Register

### 7.1 Residency — decide now, migrate next (not a same-week blocker)

**Reframe the legal weight:** jp-tokyo is a *self-imposed* requirement (requirements.md N-03) + an APPI Art. 28 cross-border-transfer *disclosure* obligation — **not** an absolute legal storage ban (APPI permits cross-border with equivalent safeguards + disclosure/consent). It is, however, table-stakes on a 税理士法人 security questionnaire. So: **the artifact a 所長 needs first is a credible written plan + signed DPAs, not a completed migration.**

Use the **cheap config paths**, not the platform rewrite the research implied:
- **Web compute:** `vercel.json` `regions: ["hnd1"]` (Tokyo) — one line, **do not "leave Vercel."**
- **Postgres:** move to **Supabase Tokyo** or **Cloud SQL `asia-northeast1`** + pgvector. Neon has no Tokyo region and regions are immutable, so this is a recreate+migrate (logical dump/restore; vectors are portable, no re-embed). The *real* work is swapping off `@prisma/adapter-neon` for `@prisma/adapter-pg` — which changes serverless connection pooling — **not** the data copy. **AlloyDB is over-spec'd/expensive** (no scale-to-zero); pick Supabase or Cloud SQL.
- **Embeddings + Gemini triage:** consolidate on **Vertex AI `asia-northeast1`** with ZDR/no-training (your `docs/research/embeddings-and-residency.md` already reached this — execute it).
- **Claude drafting:** verify a Tokyo-*regional* Claude endpoint exists on Vertex *first*. If not, drafting stays a **documented, firm-consented 越境移転** with no-training + ZDR as the safeguard — accept that rather than blocking the whole tier. The honest framing: storage + embeddings + triage residency is achievable; Claude residency is contingent and may be a consented transfer indefinitely.
- **Replace write-only `Firm.region` with a single boot-time assertion** (verified: `.region` is set on create, never read). Refuse to boot if `DATABASE_URL`/Vertex location isn't the expected JP project. Don't add the research's per-write region check — every firm is jp-tokyo; it's a deploy-time fact.
- **The email/LLM-trace transit path leaks cross-border on every message** regardless of where Postgres lives — rank inbound (Resend), Inngest payloads, Clerk US identity, and LLM-trace stores (Section 5) *alongside* the DB move, and address backup/PITR residency + the tombstone-vs-PITR-window tension (a redaction doesn't purge a 35-day snapshot).
- **Fix the non-uniform no-training config:** the residency doc notes Google AI Studio *free tier trains on inputs* — so "no-training" is config-dependent and not uniformly true today. Moving triage to Vertex closes this.

### 7.2 RTBF — the highest-severity *and* cheapest fix (mis-scoped by the research)

**Verified:** auto-added knowledge chunks carry `metadata.documentId = inquiry.id` (`knowledge-ingest.ts` + `autoAddKnowledgeFn`), and `tombstoneClient` already collects the deleted client's `inquiryIds`. So the cascade is **queryable today, no schema change, S-effort** (research said M + ingest change). Inside the existing tombstone transaction, add:
- `DELETE FROM knowledge_chunks WHERE firm_id=$1 AND metadata->>'documentId' = ANY(<inquiryIds>)` — purges the client's words + embeddings from the RAG store (a vector still surfacing the client's words to a firm-mate's query is a silent §38 breach).
- **Clear `Inquiry.headers`** (verified untouched today — raw From/To/Reply-To carry the client's name+email in cleartext, surviving a 削除要求).
- **Cascade-delete `client_integration_bindings`** for the client.
- *Caveat to document:* user-*uploaded* knowledge docs aren't inquiry-linked, so the cascade covers only auto-added 過去回答 chunks — which are exactly the ones containing the client's words.

Keep the audit row (legal proof of deletion). Write a one-page RTBF runbook: owner-triggered, tombstone-vs-hard-delete decision, stated SLA clock — serves N-06 + APPI breach-notice in one process.

### 7.3 Subprocessor register + DPAs — three markdown files, not a platform

`docs/compliance/` as versioned markdown (the [strongdm/comply](https://github.com/strongdm/comply) "policies-as-markdown-in-repo" pattern — **not** a full Comp AI platform install pre-revenue):
1. **`data-flow.md`** — Mermaid ROPA-style map: Resend inbound → `maskMyNumber` → Postgres → triage/embed/draft → Resend outbound, marking every cross-border hop and the masking choke-point. (Cheapest, highest-leverage; prerequisite for APPI 越境移転 disclosure *and* the auditor.)
2. **`subprocessors.md`** — the canonical register the 所長 actually asks for, deliverable *before* any migration completes: vendor, data category, region, no-training status, DPA link, breach SLA. Cover all of: Anthropic, OpenAI, Google/Vertex, Clerk (US — firm *user* identity, flag as cross-border), Neon→JP-Postgres, **Render** (the research omitted it — agents *do* run there), **Inngest** (US — job payloads = client content unless minimized), Vercel, Resend (email content), Sentry, Langfuse. APPI Art. 25 makes Zeiro the 委託先 supervisor (≥ annual monitoring); these + no-re-subcontract + delete-on-request are 3 of the 5 items in your market-research §38 sales checklist. **Also catalogue the *existing* Svix webhook verification** (`/api/inbound`, `/api/webhooks/resend`, Clerk) as a CC6.x integrity control the research overlooked.
3. **`retention.md`** — *one* enforced rule that matters: client PII purged N days post-firm-offboard (scheduled Inngest job); `audit_events` kept 5 yr (immutable). Skip the 4-tier classification + GDPR-ROPA framing — it imports EU "processor" vocabulary that APPI explicitly doesn't use (Zeiro is a 個人情報取扱事業者 in its own right). Note the RTBF-vs-retention resolution: the audit log stores references + reason, *no* client PII payloads, so 5-yr retention and 削除要求 don't conflict.

**Later:** sign Vertex/Anthropic ZDR + abuse-logging-exception addenda (a procurement email, not engineering); flip `embeddings-and-residency.md` from "parked" to the chosen decision.

---

## 8. Appendix — Future Billing/Usage Metering (minimal logging to add now)

The *only* time-sensitive billing item: **Stripe Meter Events reject timestamps > 35 days old, so usage not logged now is unrecoverable.** Add the insurance, defer everything else.

**Now:**
- **`usage_events` table + `emitUsage()`** — `(id, firm_id, meter, quantity, idempotency_key UNIQUE, occurred_at, metadata)`, index `[firm_id, meter, occurred_at desc]`, `INSERT … ON CONFLICT (idempotency_key) DO NOTHING`. `firmId` first arg (tenant rule). **Keep separate from `audit_events`** (don't couple a §38/SOC-2 immutable artifact to mutable commerce). Emit **fire-and-forget, NOT transactional** with the business write — the Neon HTTP driver won't give cheap cross-statement atomicity. Keep metadata **flat** (skip OpenMeter's CloudEvents envelope — premature ceremony). Explicit idempotency keys: `draft:{draftId}`, `inquiry:{inquiryId}`, `send:{draftId}`, `seats:{firmId}:{YYYY-MM}`. Decide now: usage is **firm-level, omits actor** (or wire the system-actor UUID — don't leave ambiguous). Add a flat `region`/`provider` field so it doubles as the embedding-residency tracking surface.
- **Capture LLM tokens end-to-end** — rated **M, not S** (research undersold it). Tokens are computed in the agents service (`anthropic-draft.ts`) and dropped before reaching web. Widen the shared `draftResultSchema` discriminatedUnion (make `usage` optional across draft/no_draft/escalate), cross the agents→web boundary, and instrument **both** draft producers — including `apps/agents/src/lib/chat-persist.ts` (the second `draft.generated` emitter the research missed) — plus the separate Gemini and OpenAI embedding sites. Record `model + region + tokens` for **internal COGS only**; do *not* expose a customer-facing `llm.tokens` meter (token pricing is a hard sell to a per-seat tax-office buyer).

**Later:** plan/entitlements blob in `firm.settings` JSONB + `withinQuota()` reusing `requireCan()` (compute quotas from `usage_events` so gating and billing never diverge; add a raw-90d / monthly-rollup retention policy before the table grows unbounded on Neon). Billing engine: **default Stripe Billing Meters** (no infra, JP payments, Entitlements API) via a thin idempotent Inngest forwarder + a weekly reconciliation job. **Drop Lago to a footnote** — forwarding `firmId + meter + integer count` carries no client identity or return contents, so it's neither 個人情報 nor §38-covered; the residency-driven self-host argument is a phantom, and self-hosting Postgres+Redis+ClickHouse contradicts your own ops constraints. References: [getlago/lago](https://github.com/getlago/lago) (event-shape contract), [openmeterio/openmeter](https://github.com/openmeterio/openmeter) (meter model reference), [Stripe Meter Events API](https://docs.stripe.com/api/billing/meter-event).

---

## Prioritized Roadmap

### NOW — security/legal defects + zero-cost insurance (do regardless of any audit)

| # | Item | Effort | Compliance rationale |
|---|---|---|---|
| 1 | OAuth callback: `requireFirmContext()` + reject unless `state.firmId === ctx.firmId` | S | CC6.1 + §38 cross-tenant freee-bind hole (verified) |
| 2 | Rotate `.env.production` secrets + all webhook-signing secrets; scan git history; delete file | S | CC6.1/6.7; live key on laptop; prior-leak recurrence |
| 3 | Extend `tombstoneClient`: purge auto-added RAG chunks (`metadata->>'documentId'`), clear `Inquiry.headers`, cascade freee bindings | S | N-06 / APPI Art. 35 + §38 — verified silent data leak |
| 4 | Sign/bind `firmId` at all trust boundaries (agents query-param, agent-client body, OAuth state, channel `[firmId]` paths) | S | CC6.1 tenant isolation across services |
| 5 | CI gate: Semgrep/lint asserting `firmId`-first repos + no `$queryRaw` without `firm_id` predicate | S | CC6.1 — the top isolation control on an app-layer-only stack |
| 6 | gitleaks local pre-commit hook | S | CC6.1 "no secrets in source" |
| 7 | pino logger in `@zeiro/core`; flip `noConsole`→error; replace 4 `console.*`; unify redactor across Sentry/Mastra; strengthen JP patterns | M | §38 boundary redaction (no log sink is jp-resident) |
| 8 | Minimize Inngest/inbound payloads; forbid Prisma `log:['query']` in prod; self-host or disable Langfuse | S | §38 client-content egress to US SaaS |
| 9 | `usage_events` table + `emitUsage()` (fire-and-forget, idempotent) + capture LLM tokens | M | Billing insurance — 35-day window, unrecoverable later |
| 10 | Decide residency/platform direction (Supabase/Cloud SQL Tokyo + Vertex `asia-northeast1`); set `vercel.json` `regions:["hnd1"]`; boot-time region assertion | M | N-03 / APPI Art. 28 decision (migration staged below) |
| 11 | Neon: hardware-key MFA, restrict PITR/branch-reset, daily chain-head digest to separate table | S | Audit: the real tamper vector self-heals a hash chain |

### NEXT — evidence + hardening + the actual migrations

| # | Item | Effort | Compliance rationale |
|---|---|---|---|
| 12 | Widen audit schema (`source_ip`, `user_agent`, `request_id`, `target_type/id`, `reason`); capture via `headers()` | M | CC6/§38 incident-response "who/what/where/why" |
| 13 | SHA-256 hash chain built ASYNC (global `BIGSERIAL`, app-canonical preimage, single-writer Inngest job) + genesis ceremony | M | N-05 tamper-*evidence* |
| 14 | Vitest tenant-isolation contract tests vs Docker pgvector (defer pgTAP) | M | CC6.1 evidence artifact; N-01 完全分離 |
| 15 | Migrate app to least-privilege DB role (no UPDATE/DELETE/TRUNCATE, not `neon_superuser`); separate CI migrate role | M | Closes TRUNCATE/DDL audit-tamper hole |
| 16 | CI security pipeline: gitleaks + OSV/pnpm audit + CodeQL + Biome/tsc gate + SHA-pinned actions + Renovate + branch protection | M | CC7.1/CC8.1 change & vuln management |
| 17 | Execute residency migration (Postgres→Tokyo, swap to `@prisma/adapter-pg`; embeddings+triage→Vertex Tokyo; Claude = consented transfer if no Tokyo endpoint) | L | N-03 / APPI Art. 28 |
| 18 | Key-version `v1:` prefix in encryption format (before any rotation) + documented rotation runbook | S | CC6.1/6.7 |
| 19 | `request_id` correlation across web→Inngest→agents (plain UUID) + uptime/OOM/Inngest-failure alerts → Slack | S | CC7.1/7.2; N-20 detection |
| 20 | `docs/compliance/`: data-flow Mermaid + subprocessor register (incl. Render/Inngest/Clerk; catalogue Svix webhook verification) + retention.md | M | CC9.2 + APPI Art. 25 委託先監督 |
| 21 | RLS narrow backstop on the ~10 raw-SQL tables (FORCE, non-owner role, GUC once/request, `OR scope='global'` policy); decide Mastra-schema isolation | M | CC6.1 defense-in-depth (not blanket) |
| 22 | Evidence-grade audit export (manifest + `audit.exported` action) | S | SOC 2 export-completeness evidence |
| 23 | Scrub LLM-trace/observability PII egress; document backups/PITR residency + tombstone-vs-PITR tension | S | §38 / APPI |

### LATER — audit program + polish (buyer-triggered)

| # | Item | Effort | Compliance rationale |
|---|---|---|---|
| 24 | Start SOC 2 (Security+Confidentiality) — HOSTED platform (comp.ai cloud / discounted Vanta), skip self-host + paid readiness — only when a buyer requires it | M | Sales artifact, not the goal |
| 25 | MVP policy set (8-10) + IR tabletop + RTBF runbook + quarterly access review; static FileVault attestation (no device agent for n=1) | M | CC1-CC9 governance bulk |
| 26 | `verifyAuditChain` nightly (Inngest, Sentry+owner alert); mirror Clerk auth events; sensitive-read auditing; scope N-05 as 電帳法-*equivalent* pending legal sign-off | M | CC6/CC7 monitoring |
| 27 | Full OpenTelemetry distributed tracing + centralized log aggregator (Axiom/BetterStack) | L | CC7.3/7.4 — optional; `requestId` already buys ~90% |
| 28 | Plan/entitlements + Stripe Billing forwarder + reconciliation job (drop Lago) | M | Monetization |
| 29 | Digest-pin Dockerfile base; SBOM/Trivy | S | CC7.1/CC8.1 supply chain |
| 30 | ISO 27001 / Pマーク — **watch item only**, convert SOC 2 evidence (~80% Annex A overlap) IF a JP enterprise deal requires it | L | Premature pre-revenue |

---

**Bottom line:** Items 1-3 are real bugs — ship them this week. Items 4-11 are zero-to-low cost and stand on their own security merits. The residency migration (17) and the SOC 2 program (24) are the expensive, calendar-sensitive moves — sequence residency *ahead* of any RLS or audit gold-plating, and let a paying buyer (not a self-imposed deadline) pull the SOC 2 trigger.

*Key documents: `/Users/amuwal_1/pc/zeiro/requirements.md`, `/Users/amuwal_1/pc/zeiro/CLAUDE.md`, `/Users/amuwal_1/pc/zeiro/docs/research/embeddings-and-residency.md`, `/Users/amuwal_1/pc/zeiro/docs/research/jp-tax-office-market.md`. Verified defect sites: `apps/web/app/api/integrations/oauth/callback/[provider]/route.ts`, `packages/integrations/src/core/state.ts`, `packages/db/src/repositories/tombstone.ts`, `apps/agents/src/server.ts`, `apps/agents/src/mastra/storage.ts`, `render.yaml`, `.env.production`.*