# freee integration: HTTP vs MCP comparison

Both approaches validated end-to-end against the `tools@zeiro.io` test 事業所
(FREEE_COMPANY_ID=12652139) on 2026-05-16. Findings inform the slice-2
implementation choice for `apps/web/lib/freee/*` + the agent's
`lookup-freee-books` tool.

## What we actually did

| Step | Result |
|---|---|
| freee dev account created (`tools@zeiro.io`) | ✓ |
| Test 事業所 12652139 (ships with 10 `[demo]` partners + 6 預金/取引) | ✓ |
| Seeded 5 zeiro-flavored partners + 12 realistic 取引 (¥4,800k income / ¥1,140k expense, 90 days) | ✓ |
| HTTP smoke: /companies, /deals, /partners, /invoices | ✓ — full payload back, ~3.5s wall time for all 4 |
| MCP smoke: tools/list + list_companies + set_current_company + api_get /deals | ✓ — full payload back, ~5s wall time (includes npm cold start) |

## HTTP approach (curated REST wrapper)

**How it works:** Our own `apps/web/lib/freee/{oauth,client}.ts` does OAuth and
direct fetches to `https://api.freee.co.jp/api/1/*`. The agent gets 4–6 *curated*
Mastra tools (`lookup_recent_transactions`, `lookup_invoice`, `get_partner`,
`get_balance_summary`) that wrap specific endpoints with our own input schemas,
filter logic, and PII redaction.

| ✓ Wins | ✗ Costs |
|---|---|
| Full control over OAuth: per-firm token storage in `firms.freee_oauth` (encrypted via pgcrypto), proper refresh, no subprocess management | We hand-pick which endpoints to expose; missing endpoints = code change |
| Per-tenant scoping via Mastra `requestContext` (`firmId`, `clientId`); company_id comes from `clients.freee_company_id`, not from agent input — no spoofing | Have to track freee API version bumps ourselves (X-Api-Version header) |
| PII redaction at the tool boundary (one place, easy to audit) | No "Agent Skills" auto-context — we write the tool descriptions ourselves |
| Small agent context: 4–6 tool descriptions vs freee MCP's 15 tools + 270 endpoint surface | |
| Predictable latency, no `npx freee-mcp` cold start (~2–5s) per request | |
| No external process to monitor / restart / version-pin | |

**Validated payload shape** for `/api/1/deals`:
```json
{ "id": 3534299382, "issue_date": "2026-05-16", "amount": 11935519,
  "type": "expense", "partner_id": null, "ref_number": null, "status": "unsettled",
  "details": [{ "account_item_id": 1048636682, "tax_code": 2, "amount": ..., "description": "..." }] }
```
Easy 1:1 mapping to our agent tool's output schema.

## MCP approach (bridge to freee's official MCP)

**How it works:** Spawn `npx freee-mcp` (stdio) per request OR via remote MCP at
`https://mcp.freee.co.jp/mcp`, register it as a Mastra MCP tool source. The agent
sees freee's full 15 built-in tools + the OpenAPI surface via `freee_api_get`.

| ✓ Wins | ✗ Costs |
|---|---|
| Full freee surface available without us writing wrappers — agent can call any endpoint as new features ship | Stdio subprocess management for a multi-tenant Node server is awkward: spawn-per-request is slow (~4–5s npm cold start), keep-alive needs config-file-per-firm |
| Official OpenAPI validation + auto auth header + company_id injection inside the MCP server | freee-mcp config (`~/.config/freee-mcp/config.json` + `tokens.json`) is single-tenant by design — multi-firm requires either remote MCP w/ per-request token forwarding, or filesystem juggling we'd own |
| Agent Skills package (`freee-api-skill.zip`) injects API docs into agent context on demand — better than us writing tool descriptions | Larger agent context: 15 tools + skill docs vs 4–6 curated tools. More tokens per turn. |
| One auth path matches what 税理士 already use in Claude Desktop, so behavior stays comparable | Token refresh happens INSIDE the MCP process; our `firms.freee_oauth` table becomes irrelevant or duplicative |
| | PII redaction would have to wrap the MCP tool call instead of being inside our own tool body — less natural |

## Hard data from the smoke test

### Speed
- HTTP smoke: 3.5s for 4 sequential calls (no npm cold start; we share `fetch` and a connection)
- MCP smoke: 5.0s for connect + tools/list + 3 tool calls. The npm cold start dominates; subsequent calls in the same MCP session are fast.

### Token model mismatch
- HTTP: works with any access token (long-lived personal token from dev dashboard, or refresh-paired OAuth token).
- MCP: eagerly refreshes — fails immediately if no valid refresh_token is paired. We had to set `expires_at` far in the future to bypass during this smoke test. Production use would require the full OAuth flow per firm.

### Agent context cost
- HTTP: 4–6 tool descriptions, ~600 tokens to teach the agent.
- MCP: 15 built-in tools + freee-api-skill (per-call injected) — roughly 5–10x more tokens per turn, depending on which skill subset is loaded.

## Recommendation for slice 2: **direct HTTP**

Decisive for our case:

1. **Multi-tenant fit.** freee-mcp is built for one user on one machine
   (Claude Desktop). Wrapping it for N firms means either spawning per-request
   (slow, fragile) or forwarding tokens through a transport layer (extra
   surface to harden). Direct HTTP just stores `firms.freee_oauth` and uses
   it — same shape as our Clerk OAuth flow we already have.
2. **Token control.** We want refresh to live in our DB + audit log, not in
   `~/.config/freee-mcp/`. Critical for compliance (税理士法 §38).
3. **Agent context cost.** Slice 2 needs `read` access to ~4 entity types
   (transactions, partners, invoices, balance summary). Curated tools = far
   less LLM token spend per inquiry, with the same agent behavior.
4. **PII redaction colocation.** Our `redactPIIDeep` + `maskMyNumber` belongs
   *inside* the tool body so it's impossible to skip. With MCP, redaction
   would have to wrap the tool externally.

**When we'd reconsider MCP:**
- If freee ships a feature we want and we don't want to update our wrapper.
  Probably yearly cadence. We can add a single `freee_passthrough` tool then.
- If we eventually let users *bring their own MCP* (e.g., for an integration
  we haven't built), Mastra's MCP client support means it's a small lift.

## Cleanup after slice 2 ships

- Delete `apps/agents/scripts/freee/` (it was throwaway)
- Move `lib.ts` logic into `apps/web/lib/freee/client.ts` as the basis for the
  real, per-firm wrapper
- Keep this `COMPARISON.md` somewhere durable (probably `../../book/tech/`)
  so the decision is searchable later
