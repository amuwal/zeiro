import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'vitest/config';

// Contract tests run against the real Docker pgvector Postgres (CLAUDE.md:
// "No mocks in integration tests for the database"). Load DATABASE_URL +
// ENCRYPTION_KEY from the repo root .env so a bare `vitest run` works.
loadEnv({ path: '../../.env' });

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    // One Postgres connection shared across the file; serialise to keep seed
    // and teardown deterministic.
    fileParallelism: false,
    hookTimeout: 60_000,
    testTimeout: 60_000,
    pool: 'forks',
  },
});
