import { BRAND, FAQ_ITEMS, SITE_URL } from '@/lib/seo';

export const dynamic = 'force-static';

const lines = [
  `# ${BRAND.name}`,
  ``,
  `> ${BRAND.taglineJa}`,
  ``,
  `${BRAND.descriptionJa}`,
  ``,
  `Alternate names: ${BRAND.alternateNames.join(', ')}.`,
  `Primary language: Japanese (ja-JP). Audience: 税理士事務所 (Japanese tax-accountant offices).`,
  `Data residency: jp-tokyo. Compliance: 税理士法 §38 守秘義務. LLM contracts: no-training.`,
  `Contact: ${BRAND.emailContact}`,
  ``,
  `## What ${BRAND.name} does`,
  `- Unifies customer inquiries across email (IMAP, Gmail, Microsoft 365), LINE Official Account, Chatwork, Slack Connect, Webフォーム, SMS, 電話 (transcript).`,
  `- Auto-classifies into 期日確認 / 書類提出 / 税務質問 / 顧問契約 / その他.`,
  `- Drafts replies grounded in the firm's own manuals, FAQ, 顧問先 master, past answers, and 国税庁 通達.`,
  `- Cites every claim with a manual §, FAQ Q-番号, or past-answer date, with similarity score.`,
  `- Scores confidence 0–1; sends automatically above 0.85, escalates below 0.70 to the 所長.`,
  `- Multi-turn memory across the same thread.`,
  ``,
  `## Pilot results (9 offices, 4 months, 4–32 staff, 60–410 clients)`,
  `- Automatic-answer rate: 73%`,
  `- Median first-reply time: 22 min (was 4h18m)`,
  `- Throughput per staff: 3.4×`,
  `- Drafts with citations: 100%`,
  ``,
  `## Key links`,
  `- Landing page: ${SITE_URL}/`,
  `- Product app: https://app.zeiro.io/`,
  `- Sitemap: ${SITE_URL}/sitemap.xml`,
  `- Full LLM-readable spec: ${SITE_URL}/llms-full.txt`,
  ``,
  `## FAQ`,
  ...FAQ_ITEMS.flatMap((item) => [`### ${item.q}`, ``, item.a, ``]),
];

export function GET() {
  return new Response(lines.join('\n'), {
    headers: {
      'content-type': 'text/markdown; charset=utf-8',
      'cache-control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
    },
  });
}
