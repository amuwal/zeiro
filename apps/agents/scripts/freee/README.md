# freee testing scripts

Throwaway scripts used to validate the freee integration approach for slice 2.
Once we've decided HTTP vs MCP and built the real `apps/web/lib/freee/*` and
`apps/agents/src/mastra/tools/lookup-freee-books.ts`, these scripts will be
removed.

## Setup (one-time, ~5 minutes — only the first two steps need the user)

1. **Sign up as a freee developer** at https://app.secure.freee.co.jp/developers
   with `tools@zeiro.io`. The first signup also creates one 開発用テスト事業所
   and one test app in a single submit. Then verify the email in Gmail.
2. **From the developer dashboard → アプリ管理 → your app**, set:
   - Callback URL: `http://127.0.0.1:54321/callback` (matches freee-mcp default)
   - Copy: Client ID, Client Secret, the test 事業所's `company_id` (numeric, in
     the URL after you click into the test office).
3. **Single OAuth via freee-mcp configure** (interactive, prompts you to open a
   browser and click "Allow"):

   ```
   npx freee-mcp configure
   ```

   Paste Client ID + Client Secret when prompted. This writes
   `~/.config/freee-mcp/config.json` with refresh-capable tokens. Both
   scripts here automatically read that file — no env var needed for the
   token itself.

4. **Drop the company ID into `scripts/freee/.env.local`** (gitignored):

   ```
   FREEE_COMPANY_ID=...
   # Optional — only needed if you don't want to use ~/.config/freee-mcp/config.json:
   # FREEE_ACCESS_TOKEN=...
   ```

## Scripts

- `pnpm tsx scripts/freee/test-http.ts` — direct REST API smoke test. Hits
  /api/1/companies, /api/1/deals, /api/1/partners, /api/1/invoices. Prints
  what it found and how long each call took.
- `pnpm tsx scripts/freee/test-mcp.ts` — same surface area but via the freee
  MCP server (started in-process via `npx freee-mcp`). Uses Mastra's MCP
  client. Lets us compare DX, response shape, and latency.
- `pnpm tsx scripts/freee/seed-data.ts` — populate the test 事業所 with 3-5
  partners, a handful of recent 取引, 2 invoices, and an opening balance.
  Idempotent (safe to re-run; uses external_id tags).

## What we're trying to learn

| Question | How we'll know |
|---|---|
| Does direct HTTP give us everything we need? | test-http.ts succeeds on all four endpoints, response shapes are easy to map into our agent tool's output schema |
| Does freee MCP add enough to justify its surface area? | test-mcp.ts succeeds, latency is comparable, the MCP-mediated tool surface for the LLM is meaningfully better than our curated 4-6 tools |
| Are there hidden gotchas? | Token refresh quirks, rate limits, per-event 422s — capture in the comparison note |
