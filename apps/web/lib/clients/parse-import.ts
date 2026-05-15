import Anthropic from '@anthropic-ai/sdk';
import {
  type ClientContractType,
  type ImportedClient,
  type ImportPreview,
  importPreviewSchema,
} from '@zeiro/core';
import * as XLSX from 'xlsx';

// Variance in real 顧問先 exports defeats pure regex matching: column names
// shift across accounting software (顧問先名/会社名/取引先), names show up in
// half-width/full-width or with abbreviated 法人格 prefixes, contact cells
// sometimes hold two emails, and headers occasionally start on row 3. We send
// the parsed grid to Claude Haiku and let it reconcile — cost is bounded
// (~$0.01–0.03 per import) and the user reviews the preview before any row
// hits the database.

const MAX_ROWS_PER_IMPORT = 500;
const MAX_RAW_ROWS_TO_LLM = 600; // soft cap above MAX_ROWS_PER_IMPORT for safety
// Sonnet rather than Haiku: in initial testing Haiku silently rewrote names
// (e.g. ヤマモト → イマジアン, 田中 → 山中) — unacceptable for client data.
// Sonnet's grounding is materially better and the cost (~¥10–20 per import)
// is negligible for a flow firms run a handful of times.
const PARSER_MODEL = 'claude-sonnet-4-6';

export type ParsedImportInput = {
  filename: string;
  buffer: Buffer;
};

export type ParsedImportResult = {
  preview: ImportPreview;
  rawRowCount: number;
};

export async function parseImportFile(input: ParsedImportInput): Promise<ParsedImportResult> {
  const grid = readGrid(input.buffer);
  if (grid.length === 0) {
    return {
      preview: emptyPreview(['ファイルから行を抽出できませんでした']),
      rawRowCount: 0,
    };
  }

  const rawRowCount = grid.length;
  const trimmed = grid.slice(0, MAX_RAW_ROWS_TO_LLM);
  const preview = await callClaudeParser({
    grid: trimmed,
    truncated: rawRowCount > trimmed.length,
  });

  return { preview, rawRowCount };
}

// SheetJS handles multi-sheet workbooks transparently. CSV encoding is the
// tricky bit: when you pass `type:'buffer'` for a CSV, sheetjs falls back to
// latin1 — which mangles UTF-8 Japanese (株式会社 → æ ªå¼ä¼ç¤¾). We sniff CSV
// by content and decode as UTF-8 first; for genuine XLSX the binary path is
// correct because the format wraps strings in XML with a declared encoding.
function readGrid(buffer: Buffer): string[][] {
  const looksLikeCsv = sniffCsv(buffer);
  const wb = looksLikeCsv
    ? XLSX.read(decodeBestEffort(buffer), { type: 'string', codepage: 65001 })
    : XLSX.read(buffer, { type: 'buffer', cellDates: true, cellText: false });

  const all: string[][] = [];
  for (const name of wb.SheetNames) {
    const sheet = wb.Sheets[name];
    if (!sheet) continue;
    const rows = XLSX.utils.sheet_to_json<string[]>(sheet, {
      header: 1,
      blankrows: false,
      defval: '',
      raw: false,
    });
    for (const row of rows) {
      all.push(row.map((cell) => String(cell ?? '').trim()));
    }
  }
  return all;
}

// XLSX/XLS files have stable magic bytes; CSV doesn't. Treat everything that
// isn't ZIP (XLSX) or the old OLE compound document (XLS) as CSV.
function sniffCsv(buffer: Buffer): boolean {
  if (buffer.length < 4) return true;
  const head = buffer.subarray(0, 4);
  if (head[0] === 0x50 && head[1] === 0x4b) return false; // PK = XLSX (zip)
  if (head[0] === 0xd0 && head[1] === 0xcf && head[2] === 0x11 && head[3] === 0xe0) {
    return false; // OLE compound = legacy XLS
  }
  return true;
}

// UTF-8 covers the modern case; Shift-JIS / EUC-JP are the legacy fallbacks
// for files exported from older Windows accounting software. We try UTF-8
// first because most modern exports are correct; only fall back if the
// decode produced the U+FFFD replacement marker.
function decodeBestEffort(buffer: Buffer): string {
  const utf8 = buffer.toString('utf-8');
  if (!utf8.includes('�')) return utf8;
  for (const enc of ['shift_jis', 'euc-jp']) {
    try {
      const decoded = new TextDecoder(enc, { fatal: false }).decode(buffer);
      if (!decoded.includes('�')) return decoded;
    } catch {
      // decoder unavailable on this runtime
    }
  }
  return utf8;
}

type ClaudeParserArgs = { grid: string[][]; truncated: boolean };

async function callClaudeParser(args: ClaudeParserArgs): Promise<ImportPreview> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY missing');
  const client = new Anthropic({ apiKey });

  const tabular = args.grid.map((row, idx) => `${idx}\t${row.join('\t')}`).join('\n');

  const message = await client.messages.create({
    model: PARSER_MODEL,
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    tools: [
      {
        name: 'submit_preview',
        description: '抽出した顧問先の一覧と、検出した列マッピング・気付いた注意点を返します。',
        input_schema: {
          type: 'object',
          properties: {
            detectedColumns: {
              type: 'object',
              properties: {
                name: { type: ['string', 'null'] },
                email: { type: ['string', 'null'] },
                contractType: { type: ['string', 'null'] },
                notes: { type: ['string', 'null'] },
              },
              required: ['name', 'email', 'contractType', 'notes'],
            },
            fileNotes: { type: 'array', items: { type: 'string' } },
            rows: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  primaryEmail: { type: ['string', 'null'] },
                  contractType: {
                    type: ['string', 'null'],
                    enum: ['monthly', 'spot', 'prospect', 'unverified', null],
                  },
                  notes: { type: ['string', 'null'] },
                  issues: { type: 'array', items: { type: 'string' } },
                  sourceRow: { type: 'integer', minimum: 0 },
                },
                required: ['name', 'primaryEmail', 'contractType', 'notes', 'issues', 'sourceRow'],
              },
            },
          },
          required: ['detectedColumns', 'fileNotes', 'rows'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'submit_preview' },
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text:
              '以下は税理士事務所が顧問先一覧として書き出した表データです。' +
              '各行に行番号がプレフィックスとして付与されています。' +
              (args.truncated ? '※先頭600行のみが含まれています。\n' : '\n') +
              '\n--- データ ---\n' +
              tabular,
          },
        ],
      },
    ],
  });

  const toolUse = message.content.find(
    (block): block is Anthropic.Messages.ToolUseBlock => block.type === 'tool_use',
  );
  if (!toolUse) throw new Error('Claude did not return the expected tool use');

  const parsed = importPreviewSchema.parse(normaliseToolInput(toolUse.input));
  return clampRows(parsed);
}

// Claude occasionally emits empty strings or nulls in places the Zod schema
// expects something. The full parse should never crash on a single bad row;
// instead, fill in a sensible fallback and tag the row with an issue so the
// reviewer can edit it before confirming.
function normaliseToolInput(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw;
  const obj = raw as Record<string, unknown>;
  const rows = Array.isArray(obj.rows) ? obj.rows : [];
  return {
    ...obj,
    rows: rows.map((r) => {
      if (!r || typeof r !== 'object') return r;
      const row = r as Record<string, unknown>;
      const issues = Array.isArray(row.issues) ? [...(row.issues as string[])] : [];

      let name = typeof row.name === 'string' && row.name.trim().length > 0 ? row.name.trim() : '';
      const primaryEmail =
        typeof row.primaryEmail === 'string' && row.primaryEmail.trim().length > 0
          ? row.primaryEmail.trim()
          : null;
      if (name.length === 0) {
        issues.push('no-name');
        // Fallback so the reviewer has something editable rather than a
        // hard schema rejection. They can rename to the real 法人名 before
        // confirming.
        name = primaryEmail ? primaryEmail.split('@')[0] || '(名前未設定)' : '(名前未設定)';
      }

      const contractType =
        typeof row.contractType === 'string' && row.contractType.length > 0
          ? (row.contractType as ClientContractType)
          : null;

      const notes =
        typeof row.notes === 'string' && row.notes.trim().length > 0 ? row.notes.trim() : null;

      const sourceRow = typeof row.sourceRow === 'number' && row.sourceRow >= 0 ? row.sourceRow : 0;

      // Claude occasionally emits the same issue tag twice once we add our
      // own. Dedupe to keep the badges clean in the UI.
      return {
        name,
        primaryEmail,
        contractType,
        notes,
        issues: Array.from(new Set(issues)),
        sourceRow,
      };
    }),
  };
}

// Don't let a runaway file blow past the per-import cap. The parser is told
// the cap in the prompt; this is the belt-and-suspenders enforcement.
function clampRows(preview: ImportPreview): ImportPreview {
  if (preview.rows.length <= MAX_ROWS_PER_IMPORT) return preview;
  const dropped = preview.rows.length - MAX_ROWS_PER_IMPORT;
  return {
    ...preview,
    rows: preview.rows.slice(0, MAX_ROWS_PER_IMPORT) as ImportedClient[],
    fileNotes: [
      ...preview.fileNotes,
      `${dropped}件はこのインポートで省略されました（1回あたり${MAX_ROWS_PER_IMPORT}件上限）`,
    ],
  };
}

function emptyPreview(fileNotes: string[]): ImportPreview {
  return {
    detectedColumns: { name: null, email: null, contractType: null, notes: null },
    fileNotes,
    rows: [],
  };
}

const SYSTEM_PROMPT = `あなたは税理士事務所の顧問先データを取り込む際の構造化アシスタントです。
表形式のデータから「顧問先 (クライアント) ごとの行」を抽出して、構造化された JSON で返してください。

【最重要・厳守事項】
- 元データに含まれる文字列は **一字も変更せず** 抽出してください。
  「ヤマモト商事」を「イマジアン商事」にしたり、「みらいテック」を「ミライテック」に
  カタカナ化したり、「田中」を「山中」と書き換えるような変換は絶対に行わないこと。
- ふりがな・略称・送り仮名・全角半角の自動正規化は禁止です。元のまま保持してください。
- 「文字化けしている」「エンコーディングが崩れている」と感じても、勝手に補正せず、
  そのまま転記したうえで fileNotes に懸念を記載してください。
- 出力した name / primaryEmail / notes に含まれる日本語・英数字は、必ず入力データに
  存在する文字列の組み合わせのみで構成すること。創作や憶測は禁止。

抽出ルール:
1. 「name」(顧問先名・法人名・会社名・取引先名 など) は元の文字をそのまま保持。略称や (株)/(有) 表記もそのまま。
   どうしても見つからない場合のみ空欄 (空文字) を返す → こちらで fallback します。
2. 「primaryEmail」は1セルに複数あれば代表アドレスを1つ選び、残りは notes に「他連絡先: <そのまま転記>」と記載。空欄なら null、issues に "no-email" を追加。
3. 「contractType」は次から推定 — monthly (顧問契約・月次), spot (スポット・単発), prospect (見込み・商談中), unverified (関係不明)。判定不能なら null + issues に "ambiguous-contract"。
4. 「notes」は「決算月」「業種」「担当税理士」「主連絡先以外のメール」など、元データに書かれた値をそのまま「ラベル: 値」形式で ; で連結。元データに無い情報は追加しないこと。
5. 「sourceRow」は元データでの行番号 (プレフィックスの数字をそのまま使用)。
6. 「detectedColumns」にはユーザー向けに何列目を name / email / contractType / notes に使ったかを (該当する見出しの文字列で) 返す。見出しがなければ "Column 1" のように。
7. 「fileNotes」にはユーザーが知るべきこと (複数シートあり / ヘッダーが3行目 / 重複行を統合 / 名前が見つからない行があった など) を1〜3項目。
8. ヘッダー行・空行・小計行・合計行・タイトル行は出力に含めない。
9. 同じメールが複数行に出てきたら、最後の行を採用し、それ以前は issues に "merged-duplicate" を入れて1行にまとめる。
10. 出力は必ず submit_preview ツールに submit すること。`;
