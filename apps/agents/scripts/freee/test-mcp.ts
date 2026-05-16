/**
 * MCP-based smoke test for freee. Spawns `npx freee-mcp` as a stdio subprocess,
 * walks the MCP handshake, lists tools, and calls freee_list_companies +
 * freee_api_get to compare DX vs the direct-HTTP approach.
 *
 *   pnpm tsx scripts/freee/test-mcp.ts
 *
 * Prereq: you've run `npx freee-mcp configure` once (interactive). That writes
 * ~/.config/freee-mcp/config.json with OAuth tokens. This script reuses that
 * config — no env vars needed for the MCP server itself; only FREEE_COMPANY_ID
 * from scripts/freee/.env.local for picking which 事業所 to query.
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { companyId, logKV, logSection } from './lib';

const SAMPLE_TOOLS = [
  'freee_list_companies',
  'freee_get_current_company',
  'freee_set_current_company',
  'freee_current_user',
  'freee_api_get',
  'freee_api_list_paths',
];

async function main() {
  const t0 = Date.now();

  logSection('1. spawn npx freee-mcp (stdio)');
  const transport = new StdioClientTransport({
    command: 'npx',
    args: ['freee-mcp'],
  });
  const client = new Client(
    { name: 'zeiro-freee-mcp-smoke', version: '0.0.1' },
    { capabilities: {} },
  );
  await client.connect(transport);
  logKV('connected', `in ${Date.now() - t0}ms`);

  logSection('2. tools/list — full freee surface');
  const tools = await client.listTools();
  logKV('tool count', tools.tools.length);
  const names = new Set(tools.tools.map((t) => t.name));
  for (const expected of SAMPLE_TOOLS) {
    logKV(`  ${expected}`, names.has(expected) ? '✓' : '✗ MISSING');
  }

  logSection('3. tools/call freee_list_companies');
  const listed = await client.callTool({ name: 'freee_list_companies', arguments: {} });
  const listedText = extractText(listed);
  logKV('preview', listedText.slice(0, 200));

  logSection(`4. tools/call freee_set_current_company → ${companyId}`);
  const setRes = await client.callTool({
    name: 'freee_set_current_company',
    arguments: { company_id: companyId },
  });
  logKV('result', extractText(setRes).slice(0, 200));

  logSection('5. tools/call freee_api_get /api/1/deals (last 90 days, limit 5)');
  const since = new Date();
  since.setDate(since.getDate() - 90);
  const dealsRes = await client.callTool({
    name: 'freee_api_get',
    arguments: {
      path: '/api/1/deals',
      query: {
        company_id: companyId,
        start_issue_date: since.toISOString().slice(0, 10),
        limit: 5,
      },
    },
  });
  logKV('preview', extractText(dealsRes).slice(0, 400));

  await client.close();
  logSection(`done in ${Date.now() - t0}ms`);
}

function extractText(res: { content?: Array<{ type: string; text?: string }> } | unknown): string {
  if (
    typeof res === 'object' &&
    res !== null &&
    'content' in res &&
    Array.isArray((res as { content: unknown }).content)
  ) {
    const parts = (res as { content: Array<{ type: string; text?: string }> }).content;
    return parts
      .filter((p) => p.type === 'text' && typeof p.text === 'string')
      .map((p) => p.text)
      .join('\n');
  }
  return JSON.stringify(res);
}

main().catch((e) => {
  // biome-ignore lint/suspicious/noConsole: throwaway script
  console.error('\n[test-mcp] FAILED:', e);
  process.exit(1);
});
