# MoneyForward Cloud — API integration notes (for the MF provider)

> Researched 2026-05-30. Decision-critical facts for building the Zeiro MF data
> integration on the hardened adapter layer. Confidence tagged; verify gated/medium
> items against MF's logged-in OpenAPI YAML before coding those parts.

## Feasibility: **buildable-but-unverifiable**
We can write the adapter, but **cannot live-verify** it today — there is **no public
sandbox / test 事業所** (unlike freee), and the MF Accounting REST API only went **GA
2026-03-26** (immature). Dev-against-a-real-paid-tenant is the only documented path.

## Access prerequisites (user side — the MF equivalent of the freee dev account)
- **MF アプリポータル (App Portal)** app → self-service, free, no partner gate → yields **Client ID + Client Secret** immediately. Register: App Name (≤100 chars), Redirect URI(s) (must include `https://<host>/api/integrations/oauth/callback/moneyforward`), client auth method (**CLIENT_SECRET_BASIC** recommended — differs from freee which POSTs creds in the body).
- A **real PAID MF Cloud Accounting tenant** to develop/verify against (no sandbox found).
- Likely a **Platinum/Gold/Silver 公認メンバー 士業 firm** for support (API is "on all plans" but *support* is rank-gated; whether non-certified firms can *use* it is unconfirmed).
- The **OpenAPI YAML** (developers.api-accounting.moneyforward.com) — **403s to non-browser**; must be fetched from a logged-in browser session to confirm exact accounting endpoints/shapes.
- **§5.1 check:** MF's no-training / jp-tokyo data-residency posture for API + Remote MCP data must be verified before connecting real client books (freee already satisfies this).

## OAuth (high confidence on endpoints)
- Authorization-code flow. authorize = `https://api.biz.moneyforward.com/authorize`; token = `https://api.biz.moneyforward.com/token`. No session → redirects to `id.moneyforward.com/oauth/authorize`. **API-key auth NOT supported** for accounting.
- **PKCE S256**: reported supported (medium confidence — MF added PKCE after the base flow; confirm required-vs-optional). Our adapter already does PKCE.
- **Token lifetime CONFLICTING across docs**: 1h access / 540d refresh vs ~14d access with **refresh rotation**. Either way our token store persists-before-discard, so rotation is largely handled — but confirm.
- **Scopes** form `mfc/accounting/<resource>.read`. Confirmed: `accounts.read` (勘定科目), `journal.read` (仕訳); `journal.write` exists. Invoice product: `mfc/invoice/data.read`. Trial-balance / partners / 請求書 read scope strings **TBC from the YAML**.
- **Office/事業所 selection is token-bound** (one grant = one 事業者), **not** a consent param like freee's `prompt=select_company`. So MF binding ≠ freee's company_id query arg — the office is implicit in the token.
- **`AdapterConfig.scope` note:** currently a single string. MF needs space-joined multi-scope; keep it pre-joined (works) or widen to `string | string[]`.

## Read endpoints (what MF can actually answer)
| Capability | MF reality |
|---|---|
| **invoices** ✅ (highest confidence) | **Separate INVOICE product**: `GET https://invoice.moneyforward.com/api/v3/billings` (params `from`,`to` REQUIRED, `range_key`, `q`, `page`, `per_page`). Amounts are **STRINGS**. `payment_status` enum: `0`未設定/`1`未入金/`2`入金済/`3`未払い/`4`振込済. Pagination `{total_count,total_pages,per_page,current_page}`. |
| **partners** ⚠️ | No confirmed accounting 取引先 read; INVOICE product has `GET /api/v3/partners`. Invoice partner IDs are a **separate namespace** from accounting — join on name / `registration_code` (T-number), never on id. |
| **recent_transactions** ⚠️ | No 取引/deal equivalent. Accounting reads = **仕訳 (double-entry journals)** + trial balance. An MF journal has debit+credit **legs**, NOT freee's single income/expense row. journals-read endpoint existence at GA is **未確認**. → `capabilities.txn=false` until confirmed. |
| **profit_loss** ⚠️ | **試算表 (trial balance)** read is a named GA feature → likely exists, path UNCONFIRMED. No separate P/L. → `capabilities.pl` uncertain; return `null` (degrade) until confirmed. |

## The big architectural wrinkle: MF is a COMPOSITE
**Invoice (請求書) and Accounting (会計) are separate App Portal apps / hosts / scopes with
non-interchangeable credentials.** To match freee's single grant you likely need **two MF
grants per client**. This reshapes `PROVIDER_IDS` / bindings: either one provider with two
integration rows + two bindings per client, or two ids (`moneyforward_accounting` +
`moneyforward_invoice`). **Decide before coding** — this is the one thing that touches the
just-hardened registry/binding model.

## DataReadClient canonical shapes (extract from freee + MF together)
`DataReadClient` → `packages/integrations/src/core/read-client.ts`, async, list methods return
`{items, nextPageToken?}` (opaque token: freee = offset arithmetic, MF = cursor/page). Methods:
`capabilities():{txn,partner,invoice,pl}`, `listRecentTransactions`, `listPartners`,
`findPartnerByName`, `listInvoices`, `profitAndLoss():CanonicalPL|null`, `accountNames()`.
- `CanonicalMoney = { amount: string; currency:'JPY' }` (MF invoice amounts are strings; never do arithmetic on the raw field — parse at the citation boundary).
- `CanonicalId = string` (freee numeric → `String(id)`; MF as-is).
- `CanonicalTxn` carries optional `legs:[{side,accountName,amount,description}]` + optional `type` (a journal has no single income/expense direction) + `source:'deal'|'journal'`.
- `CanonicalInvoice.paymentStatus: 'paid'|'unpaid'|'partial'|'unknown'` (freee settled→paid; MF `2`/`4`→paid, `1`/`3`→unpaid, `0`→unknown — never guess).
- `CanonicalPartner` carries `aliases` + `registrationCode` (T-number for cross-product matching).
- Redaction becomes a **canonical-layer** concern: `redact(canonical)` masks My Number on name/description/title for ANY provider. The propose-draft citation label must become **provider-derived** (`freee会計データ` | `マネーフォワード クラウド会計` | `マネーフォワード クラウド請求書`) so a cited number names its real source.

## Open questions to resolve against the real YAML / MF support before coding accounting reads
- Exact 仕訳-read + 試算表-read endpoint paths, params (is there an office_id arg or purely token-bound?), pagination, money type.
- Is journals-read actually LIVE at GA (vs write-only)?
- PKCE required vs optional; token lifetime/rotation truth.
- One App Portal app for both invoice + accounting scopes, or two grants?
- Does the certified-member gate block USAGE or only SUPPORT? Any sandbox on request?
