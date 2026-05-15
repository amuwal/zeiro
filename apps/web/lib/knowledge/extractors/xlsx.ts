import * as XLSX from 'xlsx';
import type { Extraction } from '../types';

// Spreadsheets in tax-office contexts are usually a few hundred rows of
// structured data (顧問先一覧, 給与計算ワークシート, 申告状況管理表). We render
// each sheet as a Markdown table so the chunker can split by row and the
// drafter can cite specific rows by their visible row label. Empty rows/cols
// are trimmed; cell values are coerced to strings via SheetJS's normalised
// formatter so dates aren't serialized as raw Excel epoch numbers.
export function extractXlsx(buffer: Buffer): Extraction {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true, cellText: false });
  const sheetSummaries: { name: string; rows: number; cols: number }[] = [];
  const parts: string[] = [];

  for (const name of wb.SheetNames) {
    const sheet = wb.Sheets[name];
    if (!sheet) continue;
    const rows = XLSX.utils.sheet_to_json<string[]>(sheet, {
      header: 1,
      blankrows: false,
      defval: '',
      raw: false,
    });
    if (rows.length === 0) continue;
    const trimmed = trimEmptyColumns(rows);
    sheetSummaries.push({ name, rows: trimmed.length, cols: trimmed[0]?.length ?? 0 });
    parts.push(`## ${name}\n\n${renderTable(trimmed)}`);
  }

  if (parts.length === 0) {
    return { text: '', kind: 'xlsx', warnings: ['short-output'], meta: { sheets: [] } };
  }

  return {
    text: parts.join('\n\n'),
    kind: 'xlsx',
    warnings: [],
    meta: { sheets: sheetSummaries },
  };
}

export function extractCsv(buffer: Buffer): Extraction {
  const text = buffer.toString('utf-8');
  const wb = XLSX.read(text, { type: 'string' });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return { text: '', kind: 'xlsx', warnings: ['short-output'], meta: {} };
  const sheet = wb.Sheets[sheetName];
  if (!sheet) return { text: '', kind: 'xlsx', warnings: ['short-output'], meta: {} };
  const rows = XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    blankrows: false,
    defval: '',
    raw: false,
  });
  if (rows.length === 0) return { text: '', kind: 'xlsx', warnings: ['short-output'], meta: {} };
  const trimmed = trimEmptyColumns(rows);
  return {
    text: renderTable(trimmed),
    kind: 'xlsx',
    warnings: [],
    meta: { sheets: [{ name: sheetName, rows: trimmed.length, cols: trimmed[0]?.length ?? 0 }] },
  };
}

function trimEmptyColumns(rows: string[][]): string[][] {
  if (rows.length === 0) return rows;
  const width = Math.max(...rows.map((r) => r.length));
  const keep: number[] = [];
  for (let c = 0; c < width; c++) {
    if (rows.some((r) => (r[c] ?? '').toString().trim().length > 0)) keep.push(c);
  }
  return rows.map((r) => keep.map((c) => (r[c] ?? '').toString()));
}

function renderTable(rows: string[][]): string {
  if (rows.length === 0) return '';
  const lines: string[] = [];
  const header = rows[0] ?? [];
  lines.push(`| ${header.join(' | ')} |`);
  lines.push(`| ${header.map(() => '---').join(' | ')} |`);
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r) continue;
    lines.push(
      `| ${r.map((cell) => cell.replace(/\|/g, '\\|').replace(/\n/g, ' ')).join(' | ')} |`,
    );
  }
  return lines.join('\n');
}
