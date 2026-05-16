import { PostgresStore } from '@mastra/pg';

// Mastra owns its own schema (`mastra`) inside the same Postgres database.
// Threads, messages, working memory and run state all live there, isolated
// from our Prisma-managed app schema (`public`). That means Mastra migrations
// never touch app tables and `pnpm db:reset` doesn't blow away thread state.
export function createMastraStorage(connectionString: string): PostgresStore {
  return new PostgresStore({
    id: 'zeiro-mastra-pg',
    connectionString,
    schemaName: 'mastra',
  });
}
