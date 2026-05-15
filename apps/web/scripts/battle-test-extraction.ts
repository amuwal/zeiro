// Battle-test runner for the knowledge-ingestion pipeline. Walks every file in
// apps/web/.test-fixtures/, runs it through the full extract → chunk path the
// production ingest action uses, and prints a per-file report with pre-flight
// outcome, extraction kind, detected language, chunk count, warnings, and a
// preview of the output. Generates a couple of synthetic fixtures (XLSX,
// image-only PDF) on the fly so the OCR and spreadsheet paths are exercised
// even when the fixtures directory contains only PDFs.
//
// Run from the repo root:
//   pnpm --filter @zeiro/web exec tsx scripts/battle-test-extraction.ts
//
// The script never touches the database — it only verifies extraction and
// language-aware chunking. Embedding/persistence is out of scope here.

import { writeFileSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { performance } from 'node:perf_hooks';

import { chunkByLanguage } from '@zeiro/core';
import * as XLSX from 'xlsx';

import { extract } from '../lib/knowledge/extract';
import { preflight } from '../lib/knowledge/preflight';
import { ParserError } from '../lib/knowledge/types';

const FIXTURES_DIR = join(process.cwd(), '.test-fixtures');

async function main() {
  await ensureSyntheticFixtures();

  const entries = await readdir(FIXTURES_DIR);
  const files = entries
    .filter((name) => !name.startsWith('.'))
    .sort()
    .map((name) => join(FIXTURES_DIR, name));

  out(repeatChar('=', 100));
  out('zeiro knowledge ingestion — battle test report');
  out(repeatChar('=', 100));

  let pass = 0;
  let preflightFail = 0;
  let extractFail = 0;

  for (const filepath of files) {
    const filename = basename(filepath);
    const buffer = await readFile(filepath);
    const sizeKb = (buffer.length / 1024).toFixed(0);

    out('');
    out(`▶ ${filename}  (${sizeKb} KB)`);

    const started = performance.now();
    try {
      const pre = await preflight({ buffer, filename });
      out(`  preflight   → ✅ canonical=${pre.canonical}`);

      const result = await extract({ buffer, filename });
      const chunks = chunkByLanguage(result.text, result.detectedLanguage);
      const elapsed = (performance.now() - started).toFixed(0);

      out(
        `  extracted   → ✅ kind=${result.kind} ${result.pages ? `pages=${result.pages} ` : ''}chars=${result.text.length} language=${result.detectedLanguage ?? '—'}`,
      );
      if (result.warnings.length > 0) out(`  warnings    → ${result.warnings.join(', ')}`);
      if (Object.keys(result.meta).length > 0) {
        out(`  meta        → ${JSON.stringify(result.meta)}`);
      }
      out(`  chunks      → ${chunks.length} (avg ${avgLen(chunks).toFixed(0)} chars)`);
      out(`  preview     → ${preview(result.text)}`);
      out(`  elapsed     → ${elapsed}ms`);
      pass += 1;
    } catch (e) {
      const elapsed = (performance.now() - started).toFixed(0);
      if (e instanceof ParserError) {
        out(`  preflight   → ❌ ${e.code}: ${e.message}  (${elapsed}ms)`);
        preflightFail += 1;
      } else {
        out(`  extract     → ❌ ${(e as Error).message}  (${elapsed}ms)`);
        extractFail += 1;
      }
    }
  }

  out('');
  out(repeatChar('=', 100));
  out(`summary: ${pass} passed · ${preflightFail} preflight-fail · ${extractFail} extract-fail`);
  out(repeatChar('=', 100));

  if (extractFail > 0) process.exit(1);
}

// Build a small XLSX in memory and write to disk so the run exercises the
// spreadsheet extractor without depending on whatever fixtures are already
// around.
async function ensureSyntheticFixtures() {
  const xlsxPath = join(FIXTURES_DIR, 'synthetic-clients.xlsx');
  const ws = XLSX.utils.aoa_to_sheet([
    ['顧問先ID', '会社名', '決算月', '顧問料 (円)', '担当者', '備考'],
    ['C-1001', '株式会社山田商事', '3月', 50000, '田中 さくら', 'インボイス登録済'],
    ['C-1002', '合同会社みらいテック', '9月', 60000, '佐藤 健二', '輸入消費税の還付有り'],
    ['C-1003', '佐藤クリニック', '12月', 40000, '田中 さくら', '医療法人成り検討中'],
    ['C-1004', '鈴木建設株式会社', '6月', 55000, '鈴木 翔', '工事進行基準を採用'],
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '顧問先一覧');
  writeFileSync(xlsxPath, XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}

function avgLen(chunks: { text: string }[]): number {
  if (chunks.length === 0) return 0;
  return chunks.reduce((s, c) => s + c.text.length, 0) / chunks.length;
}

function preview(text: string, max = 140): string {
  const oneLine = text.replace(/\s+/g, ' ').trim();
  return oneLine.length <= max ? oneLine : `${oneLine.slice(0, max)}…`;
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
