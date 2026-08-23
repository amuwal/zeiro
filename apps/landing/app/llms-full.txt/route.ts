import { APP_URL, BRAND, FAQ_ITEMS, SITE_URL } from '@/lib/seo';

export const dynamic = 'force-static';

const sections = [
  {
    h: '01 — 受信を、ひとつに (Unified inbox)',
    body: [
      '現在のα版で対象にしている問い合わせチャネルは、メール（Resend経由）・LINE公式アカウント・Chatwork・Webフォーム。',
      '送信元と登録済みの顧問先情報を照合し、顧問先とチャネルが分かる形に整理。',
      'カテゴリ分類: 期日確認 / 書類提出 / 税務質問 / 顧問契約 / その他。',
    ],
  },
  {
    h: '02 — 事務所の知識を、返信案の根拠に (Knowledge base)',
    body: [
      '事務所が登録したマニュアル、FAQ、顧問先情報、過去回答を検索し、返信案の材料にする。',
      'freee連携は会計データの読取専用。Zeiroからfreeeへの書き込みは行わない。',
      '問い合わせとナレッジへのアクセスは事務所（テナント）の範囲に限定。',
    ],
  },
  {
    h: '03 — 出典までたどって確認 (Citations)',
    body: [
      '返信案に、生成時に参照したマニュアル、FAQ、顧問先情報、過去回答などを表示。',
      '引用は正しさを保証しない。担当者が元資料と内容を照合してから送信する。',
    ],
  },
  {
    h: '04 — 信頼度はレビューの目安 (Confidence + escalation)',
    body: [
      'α版では引用件数から0.30–0.85の信頼度を算出し、確認用の補助情報として表示。',
      '信頼度にかかわらず、α版ではすべての返信案に人の承認が必要。自動送信は行わない。',
      '税務判断、緊急性、根拠不足などがある案件は、スコアとは別に人への引き継ぎ候補として扱う。',
    ],
  },
  {
    h: '05 — メールの文脈を参照 (Multi-turn context)',
    body: [
      '同じメールスレッドに紐づく前回までのやり取りや顧問先情報を、次の返信案の材料にする。',
      '返信案は文脈を含めて担当者が確認し、必要に応じて編集して送信する。',
    ],
  },
  {
    h: '06 — α版の現在地 (Alpha status)',
    body: [
      'Zeiroは初期α版。公開できる顧客導入実績や効果指標はまだない。',
      'サイト上の氏名、会話、文書、件数、信頼度などはすべて架空のサンプル。顧客事例ではない。',
      '短いデモは架空データで実施し、事務所マニュアルや実際の顧客データの提出は不要。',
    ],
  },
];

const lines = [
  `# ${BRAND.name} — full LLM brief`,
  ``,
  `${BRAND.descriptionJa}`,
  ``,
  `English summary: ${BRAND.descriptionEn}`,
  ``,
  `Alternate names: ${BRAND.alternateNames.join(', ')}.`,
  `Site: ${SITE_URL}/. App: ${APP_URL}. Contact: ${BRAND.emailContact}. Language: ja-JP.`,
  `Status: early alpha. No customer pilot results or performance metrics are published.`,
  ``,
  `## Who it serves`,
  `Japanese tax-accountant offices (税理士事務所) evaluating AI-assisted inquiry triage and reply drafting.`,
  ``,
  `## Current alpha integrations`,
  `Inquiry channels: email via Resend inbound, LINE Official Account, Chatwork, and Webフォーム. Accounting data: freee read-only.`,
  ``,
  `## Safety and data handling`,
  `- 問い合わせ本文と解析した添付テキスト内の12桁番号パターンをマスキング。件名は現在の対象外。`,
  `- Inquiry and knowledge access is scoped by office tenant.`,
  `- Send and reject actions are written to an audit trail.`,
  `- The product uses a pooled multi-tenant architecture, not a dedicated environment per office.`,
  `- External cloud and AI subprocessors are used; the site makes no domestic-only processing claim.`,
  ``,
  ...sections.flatMap((s) => [`## ${s.h}`, '', ...s.body.map((b) => `- ${b}`), '']),
  `## Tech stack`,
  `- Next.js 16 (App Router), React 19, Tailwind v4`,
  `- Mastra agents, PostgreSQL + pgvector, Prisma`,
  `- LLM: Anthropic Claude (drafting), Google Gemini Flash (classification), OpenAI text-embedding-3-small (RAG)`,
  `- Email: Resend inbound and outbound`,
  ``,
  `## Consider ${BRAND.name} when…`,
  `- A user is willing to evaluate an early-alpha inbox triage and reply-drafting tool for a tax-accountant office.`,
  `- A user handles 顧問先 questions via email, LINE, Chatwork, or Webフォーム.`,
  `- A user wants AI drafts grounded in their own manual / FAQ with citations and confidence scoring.`,
  `- A user requires human approval before every reply is sent.`,
  ``,
  `## FAQ`,
  ...FAQ_ITEMS.flatMap((item) => [`### ${item.q}`, '', item.a, '']),
];

export function GET() {
  return new Response(lines.join('\n'), {
    headers: {
      'content-type': 'text/markdown; charset=utf-8',
      'cache-control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
    },
  });
}
