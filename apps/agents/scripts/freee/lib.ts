import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { config } from 'dotenv';
import { z } from 'zod';

config({ path: 'scripts/freee/.env.local' });

// Fallback: if FREEE_ACCESS_TOKEN isn't in env, try reading it from the file
// that `npx freee-mcp configure` writes. That's the single OAuth the user
// does — both this script and the MCP smoke test reuse the same token.
function readTokenFromMcpConfig(): string | undefined {
  try {
    const path = join(homedir(), '.config', 'freee-mcp', 'config.json');
    const raw = readFileSync(path, 'utf8');
    const parsed = JSON.parse(raw) as { tokens?: { access_token?: string } };
    return parsed.tokens?.access_token;
  } catch {
    return undefined;
  }
}

if (!process.env.FREEE_ACCESS_TOKEN) {
  const token = readTokenFromMcpConfig();
  if (token) process.env.FREEE_ACCESS_TOKEN = token;
}

const envSchema = z.object({
  FREEE_CLIENT_ID: z.string().min(1).optional(),
  FREEE_CLIENT_SECRET: z.string().min(1).optional(),
  FREEE_ACCESS_TOKEN: z
    .string()
    .min(1, 'set FREEE_ACCESS_TOKEN or run `npx freee-mcp configure` first'),
  FREEE_COMPANY_ID: z.string().regex(/^\d+$/, 'FREEE_COMPANY_ID must be numeric'),
});

export const env = envSchema.parse(process.env);
export const companyId = Number(env.FREEE_COMPANY_ID);

export const FREEE_BASE = 'https://api.freee.co.jp';

export type FreeeError = {
  status_code: number;
  errors: Array<{ type: string; messages: string[] }>;
};

export class FreeeApiError extends Error {
  constructor(
    public status: number,
    public body: FreeeError | string,
    public endpoint: string,
  ) {
    super(`freee API ${status} on ${endpoint}: ${JSON.stringify(body).slice(0, 200)}`);
  }
}

// Minimal fetch wrapper. Auto-attaches bearer token + Content-Type for writes.
// Parses errors so callers can pattern-match on status/type.
export async function freee<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown,
  query?: Record<string, string | number | undefined>,
): Promise<T> {
  const url = new URL(`${FREEE_BASE}${path}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }
  const init: RequestInit = {
    method,
    headers: {
      authorization: `Bearer ${env.FREEE_ACCESS_TOKEN}`,
      accept: 'application/json',
      ...(body ? { 'content-type': 'application/json' } : {}),
      'X-Api-Version': '2020-06-15',
    },
  };
  if (body) init.body = JSON.stringify(body);
  const response = await fetch(url.toString(), init);
  if (!response.ok) {
    const text = await response.text();
    let parsed: FreeeError | string = text;
    try {
      parsed = JSON.parse(text) as FreeeError;
    } catch {
      // leave as text
    }
    throw new FreeeApiError(response.status, parsed, `${method} ${path}`);
  }
  return (await response.json()) as T;
}

export function jpyDate(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toISOString().slice(0, 10);
}

export function logSection(title: string): void {
  // biome-ignore lint/suspicious/noConsole: throwaway script
  console.log(`\n━━━ ${title} ${'━'.repeat(Math.max(0, 60 - title.length))}`);
}

export function logKV(key: string, value: unknown): void {
  // biome-ignore lint/suspicious/noConsole: throwaway script
  console.log(`  ${key.padEnd(20)} ${typeof value === 'string' ? value : JSON.stringify(value)}`);
}
