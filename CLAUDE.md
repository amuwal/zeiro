# CLAUDE.md — Project rules

For AI assistants working on this repo (Claude Code, Cursor, etc.). Humans should follow the same rules.

Project context: [requirements.md](./requirements.md). Read it before any non-trivial change — this is a regulated domain (税理士法 §38 守秘義務).

## Stack

- Runtime: Node.js 22+, pnpm 10+
- Lang: TypeScript strict (see `tsconfig.base.json`)
- Web: Next.js 16 (App Router), React 19
- Agents: Mastra 1.8+ (`@mastra/core`) — Agent / createTool / createWorkflow
- DB: PostgreSQL + pgvector. Local: Docker (`pgvector/pgvector:pg17`). Prod: Neon.
- ORM: Prisma 6 with `@prisma/adapter-neon` (auto-detected when `DATABASE_URL` points to `*.neon.tech`)
- LLM: Anthropic Claude (drafting), Google Gemini Flash (classification), OpenAI text-embedding-3-small (RAG)
- Email: SendGrid Inbound Parse
- Validation: Zod 4
- Lint/format: Biome 2

## Layout

- `apps/web` — Next.js review UI + inbound webhook
- `apps/agents` — Mastra service (agents, tools, workflows, prompts)
- `packages/core` — shared Zod schemas, constants, PII utils, domain errors
- `packages/db` — Prisma schema + generated client + repositories
- `packages/email` — SendGrid Inbound Parse adapter

## Ports (reserve 6xxx range)

- `6001` — web (Next.js)
- `6002` — agents (Mastra dev / playground)
- `6080` — Prisma Studio
- `6432` — Postgres (Docker)

Avoid 6000 (X11), 6666/6667/6697 (IRC, browser-blocked).

## Code rules

### File size
Hard cap: **200 lines per TS/TSX source file**. Split by responsibility — one file per agent / tool / repository / route handler / component.

CSS files are exempt — they describe coherent design slices (e.g. `inbox.css` covers everything inbox-pane visual). Aim for ≤ 400 lines per CSS file; split by tab/screen, not by individual class.

### Comments
Default: write none. Names should explain themselves.
Add a comment only when the *why* is non-obvious — hidden constraint, workaround, surprising behaviour. Never restate what the code does. No `// TODO: implement` filler. No "AI-generated" headers.

### DRY
- Shared types / Zod schemas → `packages/core/src/schemas`.
- DB ops → `packages/db/src/repositories`.
- LLM prompts → `apps/agents/src/mastra/prompts`.
- Constants/thresholds → `packages/core/src/constants`.

### SOLID
- One module = one responsibility. Mastra agents / tools / workflows live in their own files.
- Repositories own a single table; expose narrow query functions, not generic ORM access.
- Tools accept Zod-validated inputs and return Zod-validated outputs.

### TypeScript
- `strict: true`. No `any`. Use `unknown` + Zod parse at boundaries.
- Validate every external input (HTTP body, env, LLM JSON) with Zod.
- `import type` for type-only imports (Biome enforces).

### Errors
- Domain errors live in `packages/core/src/errors.ts`. Throw typed errors; format at boundaries.
- No silent catches. Repositories return `null` for "not found"; throw for unexpected errors.

### Schemas
- DB stays *loose* during MVP — no CHECK constraints on enum-like columns; every primary entity has a `metadata`/`settings`/`analysis` JSONB for forward-compatible extension.
- Zod stays *tight* — value-set restrictions (status, urgency, category) are enforced at the application boundary, not the DB.
- Tighten DB constraints only after the pilot phase stabilises requirements.

### Security (non-negotiable per requirements §5.1)
- **Tenant isolation**: every repository function takes `firmId` as the first argument. **Never** add a function that omits it. With Neon's serverless driver we can't rely on JWT-aware RLS — application-layer filtering is the only line of defence.
- PII: mask My Number on ingest via `maskMyNumber` from `@zeiro/core` *before* persistence and *before* any LLM call.
- Audit log every send/reject (who, when, model, citations).
- Data residency: `jp-tokyo` only.
- LLM provider must have a no-training contract.

## Don'ts

- No fallbacks for cases that can't happen.
- No backwards-compat shims for code we own.
- No `// TODO` without a ticket reference.
- No `console.log` in committed code (Biome warns).
- No `as any`. `as unknown as T` only at trusted FFI boundaries.
- No mocks in integration tests for the database — run against the Docker Postgres instance.
- No CHECK constraints on enum-like columns at this stage. Validate values in Zod.

## Adding a new agent

1. Define prompt in `apps/agents/src/mastra/prompts/<name>.ts` (string export).
2. Define agent in `apps/agents/src/mastra/agents/<name>.ts` (one Agent export).
3. Register in `apps/agents/src/mastra/index.ts`.
4. If the agent needs a tool, define it in `apps/agents/src/mastra/tools/<name>.ts` with Zod input/output schemas.

## Adding a Server Action / route handler that touches tenant data

1. First line: `const { firmId, userId, role } = await requireFirmContext();`
2. Pass `firmId` into every repository call. Never hard-code or read from headers/query.
3. For audit log writes, `actorId = userId`. For system-driven flows (inbound webhook, scheduled jobs), use a fixed system-actor UUID and the call site should make the "why system" intent obvious.
4. Public routes (no Clerk auth) verify their own signatures: SendGrid Basic Auth + IP allowlist for `/api/inbound`, Svix for `/api/webhooks/clerk`. Add new public routes to `middleware.ts` `isPublicRoute`.

## Adding a new repository

1. Create `packages/db/src/repositories/<entity>.ts`.
2. Export narrow query functions (`listX`, `getX`, `createX`). Always include a `firmId` parameter — no exceptions.
3. Add a Zod schema for the row in `packages/core/src/schemas/<entity>.ts` if it's shared with the client.
4. Re-export from `packages/db/src/index.ts`.

## Adding a Prisma migration

1. Edit `packages/db/prisma/schema.prisma`.
2. `pnpm --filter @zeiro/db db:migrate -- --name <slug>` (creates and applies).
3. For `vector(*)` columns, add the SQL by hand to the generated migration — Prisma's `Unsupported` type doesn't generate it.
