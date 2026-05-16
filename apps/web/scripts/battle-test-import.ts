// Battle-test runner for the bulk client import. Walks a list of fixtures
// and reports preflight + parse outcomes per file. Differs from
// test-client-import.ts (which is a single-file end-to-end probe) by
// covering rejection paths and quirky inputs in a single pass.

import { readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { performance } from 'node:perf_hooks';

import { config } from 'dotenv';

import { parseImportFile } from '../lib/clients/parse-import';

config({ path: '.env.local' });

const FIXTURES = [
  // Preflight-only cases (parse never runs). We bypass the server action's
  // formal preflight here and apply the same checks inline so the report is
  // self-contained.
  { path: '.test-fixtures/spoofed.csv', expect: 'preflight-reject' },
  { path: '.test-fixtures/oversized.csv', expect: 'preflight-reject' },
  { path: '.test-fixtures/messy-koumonsaki.csv', expect: 'parse' },
  { path: '.test-fixtures/multi-sheet-koumonsaki.xlsx', expect: 'parse' },
  { path: '.test-fixtures/shift-jis-koumonsaki.csv', expect: 'parse' },
  { path: '.test-fixtures/legacy.xls', expect: 'parse' },
  { path: '.test-fixtures/large-200.csv', expect: 'parse' },
  { path: '.test-fixtures/over-cap-520.csv', expect: 'parse-clamp' },
] as const;

const MAX_BYTES = 5 * 1024 * 1024;

async function main() {
  out(repeatChar('=', 100));
  out('client import — battle test report');
  out(repeatChar('=', 100));

  for (const fx of FIXTURES) {
    const p = join(process.cwd(), fx.path);
    const buffer = await readFile(p);
    const sizeKb = (buffer.length / 1024).toFixed(0);
    out('');
    out(`▶ ${basename(p)}  (${sizeKb} KB, expect=${fx.expect})`);

    // Preflight equivalent: size + ext + magic-byte spoof check.
    if (buffer.length > MAX_BYTES) {
      out(`  preflight → ❌ file_too_large (${sizeKb} KB > ${MAX_BYTES / 1024} KB)`);
      continue;
    }
    // Spoof check: claims to be CSV but starts with %PDF-
    if (buffer.subarray(0, 5).toString('latin1') === '%PDF-' && p.endsWith('.csv')) {
      out('  preflight → ❌ extension_spoof (file starts with %PDF-)');
      continue;
    }
    out('  preflight → ✅');

    if (fx.expect === 'preflight-reject') {
      out('  ⚠️  expected preflight reject but passed — preflight needs strengthening');
      continue;
    }

    try {
      const t = performance.now();
      const { preview, rawRowCount } = await parseImportFile({
        filename: basename(p),
        buffer,
      });
      const elapsed = ((performance.now() - t) / 1000).toFixed(1);
      out(
        `  parsed     → ✅ rawRows=${rawRowCount}  parsedRows=${preview.rows.length}  (${elapsed}s)`,
      );
      out(
        `  columns    → name=${preview.detectedColumns.name ?? '—'}  email=${preview.detectedColumns.email ?? '—'}  contract=${preview.detectedColumns.contractType ?? '—'}`,
      );
      if (preview.fileNotes.length > 0) {
        out('  fileNotes:');
        for (const n of preview.fileNotes) out(`    · ${n}`);
      }
      // Spot-check first + last row for fidelity
      const first = preview.rows[0];
      const last = preview.rows[preview.rows.length - 1];
      if (first) out(`  first      → [${first.sourceRow}] ${first.name}  <${first.primaryEmail ?? '—'}>  ${first.contractType ?? '—'}`);
      if (last && preview.rows.length > 1) {
        out(`  last       → [${last.sourceRow}] ${last.name}  <${last.primaryEmail ?? '—'}>  ${last.contractType ?? '—'}`);
      }
      // Issue summary
      const issues = new Map<string, number>();
      for (const r of preview.rows) {
        for (const issue of r.issues) issues.set(issue, (issues.get(issue) ?? 0) + 1);
      }
      if (issues.size > 0) {
        out(`  issues     → ${Array.from(issues.entries()).map(([k, v]) => `${k}:${v}`).join('  ')}`);
      }
    } catch (e) {
      out(`  parsed     → ❌ ${(e as Error).message}`);
    }
  }

  out('');
  out(repeatChar('=', 100));
}

function out(line: string): void {
  process.stdout.write(`${line}\n`);
}
function repeatChar(ch: string, n: number): string {
  return new Array(n + 1).join(ch);
}

main().catch((e) => {
  process.stderr.write(`${(e as Error).stack ?? (e as Error).message}\n`);
  process.exit(1);
});
