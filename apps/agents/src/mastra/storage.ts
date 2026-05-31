import { PostgresStore } from '@mastra/pg';

// Mastra owns its own schema (`mastra`) inside the same Postgres database.
// Threads, messages, working memory and run state all live there, isolated
// from our Prisma-managed app schema (`public`). That means Mastra migrations
// never touch app tables and `pnpm db:reset` doesn't blow away thread state.
//
// Tenant isolation in the `mastra` schema: every thread is created and recalled
// with `resource = firmId`, and that firmId always originates from a verified
// source — the HMAC firm token on the chat endpoints (server.ts) and the inquiry
// pipeline's token-verified input.firmId (run-inquiry.ts). Mastra's PostgresStore
// scopes recall/getThreadById by {threadId, resourceId}, so raw email bodies
// stored here are only ever read back under the same (verified) firmId that
// wrote them. 守秘義務 (§38) holds across the agent thread store, not just the
// app schema.
export function createMastraStorage(connectionString: string): PostgresStore {
  return new PostgresStore({
    id: 'zeiro-mastra-pg',
    connectionString,
    schemaName: 'mastra',
  });
}
