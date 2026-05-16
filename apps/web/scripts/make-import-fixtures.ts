// Generates the messy fixtures the import battle-test runs against. Lives in
// scripts/ rather than .test-fixtures/ because it's reproducible — the
// fixture files are gitignored and regenerated on demand.

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import * as XLSX from 'xlsx';

const DIR = join(process.cwd(), '.test-fixtures');

// 1. Multi-sheet XLSX with Excel quirks (date cells, formula-result cells,
//    one sheet per category — the way 税理士事務所 actually slice their data).
function makeMultiSheetXlsx() {
  const wb = XLSX.utils.book_new();

  const sheet1 = XLSX.utils.aoa_to_sheet([
    ['顧問先一覧 (法人) - 2026年度版'],
    ['作成: 経理部 田中'],
    [],
    ['会社名', '担当者メール', '契約', '決算月', '担当', '備考'],
    ['株式会社 山田商事', 'yamada@yamada-shoji.co.jp', '月次', 3, '田中', 'インボイス登録済'],
    ['(有)鈴木建設', 'kenji.s@suzuki-kensetsu.jp', '月次', 6, '鈴木', '工事進行基準'],
    [
      '合同会社みらいテック',
      'suzuki.taro@mirai-tech.jp / keiri@mirai-tech.jp',
      '月次',
      9,
      '佐藤',
      '輸入消費税還付有り',
    ],
    ['佐藤クリニック', 'sato@sato-clinic.jp', '月次', 12, '田中', '医療法人成り検討中'],
  ]);

  const sheet2 = XLSX.utils.aoa_to_sheet([
    ['顧問先一覧 (個人)'],
    [],
    ['氏名', 'メール', '契約形態', '備考'],
    ['田中 美咲', 'misaki.tanaka@gmail.com', 'スポット', '確定申告のみ'],
    ['鈴木 翔', 'sho.suzuki@example.com', '見込み', '商談中'],
    ['ヤマモト 太郎', 'yamamoto@example.co.jp', 'スポット', '副業の確定申告'],
  ]);

  XLSX.utils.book_append_sheet(wb, sheet1, '法人');
  XLSX.utils.book_append_sheet(wb, sheet2, '個人');
  writeFileSync(
    join(DIR, 'multi-sheet-koumonsaki.xlsx'),
    XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }),
  );
}

// 2. Shift-JIS encoded CSV — the legacy case for older Windows exports.
async function makeShiftJisCsv() {
  const utf8 =
    '顧問先名,メール,契約\n' +
    '株式会社シフトジス商事,sjis@example.co.jp,月次顧問\n' +
    '合同会社レガシー,legacy@example.jp,スポット\n' +
    'カナ商事(有),kana@example.com,月次\n';
  // Shell out to the system `iconv` (macOS + most Linux distros ship it).
  // Avoids pulling in iconv-lite as a runtime dep just for the test runner.
  const { execSync } = await import('node:child_process');
  const path = join(DIR, 'shift-jis-koumonsaki.csv');
  execSync(`iconv -f UTF-8 -t SHIFT_JIS > "${path}"`, { input: utf8 });
}

// 3. 200-row CSV to test bulk-volume behavior (well under the 500 cap but
//    enough rows that token cost + UI scroll matters).
function makeLargeCsv() {
  const rows: string[] = ['顧問先名,メール,契約形態,担当'];
  const contracts = ['月次顧問', 'スポット', '見込み', '月次'];
  for (let i = 1; i <= 200; i++) {
    const id = String(i).padStart(4, '0');
    rows.push(
      `テスト顧問先 ${id},client.${id}@example.co.jp,${contracts[i % contracts.length]},田中`,
    );
  }
  writeFileSync(join(DIR, 'large-200.csv'), `${rows.join('\n')}\n`);
}

// 4. A spoofed extension: rename a PDF to .csv. The preflight should
//    reject it cleanly.
function makeSpoofed() {
  const fakePdf = Buffer.from('%PDF-1.4\n%fake content here, not really a pdf\n', 'utf-8');
  writeFileSync(join(DIR, 'spoofed.csv'), fakePdf);
}

// 5. An oversized file to test the 5 MB cap.
function makeOversized() {
  const big = Buffer.alloc(6 * 1024 * 1024, 'a'); // 6 MB of 'a'
  writeFileSync(join(DIR, 'oversized.csv'), big);
}

// 6. A 520-row file to exercise the MAX_ROWS_PER_IMPORT=500 clamp.
function makeOverCapCsv() {
  const rows: string[] = ['会社名,メール,契約'];
  for (let i = 1; i <= 520; i++) {
    const id = String(i).padStart(4, '0');
    rows.push(`オーバーキャップ商事 ${id},cap.${id}@example.co.jp,月次顧問`);
  }
  writeFileSync(join(DIR, 'over-cap-520.csv'), `${rows.join('\n')}\n`);
}

// 7. Legacy XLS (binary Excel 97-2003). SheetJS can write XLS too; we use
//    bookType:'biff8' which is the format real legacy accounting software
//    still exports. Smaller fixture so the test runs fast.
function makeLegacyXls() {
  const ws = XLSX.utils.aoa_to_sheet([
    ['顧問先名', 'メール', '契約', '備考'],
    ['(株)レガシー会計', 'legacy@example.co.jp', '月次', '古いExcel形式'],
    ['オールド商事', 'old@example.jp', 'スポット', '1997年からの取引'],
    ['ビンテージ事務所', 'vintage@example.com', '月次', null],
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '顧問先');
  writeFileSync(
    join(DIR, 'legacy.xls'),
    XLSX.write(wb, { type: 'buffer', bookType: 'biff8' }),
  );
}

async function main() {
  console.log('generating fixtures into', DIR);
  makeMultiSheetXlsx();
  console.log('  ✓ multi-sheet-koumonsaki.xlsx (2 sheets, 7 + 3 rows)');
  try {
    await makeShiftJisCsv();
    console.log('  ✓ shift-jis-koumonsaki.csv (3 rows)');
  } catch (e) {
    console.log(`  ⚠️  shift-jis: ${(e as Error).message}`);
  }
  makeLargeCsv();
  console.log('  ✓ large-200.csv (200 rows)');
  makeSpoofed();
  console.log('  ✓ spoofed.csv (PDF disguised as CSV)');
  makeOversized();
  console.log('  ✓ oversized.csv (6 MB)');
  makeOverCapCsv();
  console.log('  ✓ over-cap-520.csv (520 rows, exceeds 500-row clamp)');
  makeLegacyXls();
  console.log('  ✓ legacy.xls (binary Excel 97-2003, 3 rows)');
}

main();
