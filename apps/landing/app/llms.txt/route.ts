import { APP_URL, BRAND, FAQ_ITEMS, SITE_URL } from '@/lib/seo';

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
  `Status: early alpha. Zeiro has no published customer pilot results or performance metrics.`,
  `Contact: ${BRAND.emailContact}`,
  ``,
  `## What ${BRAND.name} does`,
  `- Organizes inquiries from email (via Resend), LINE Official Account, Chatwork, and Webフォーム.`,
  `- Auto-classifies into 期日確認 / 書類提出 / 税務質問 / 顧問契約 / その他.`,
  `- Drafts replies from firm-provided manuals, FAQ, 顧問先 information, and past answers.`,
  `- Displays the source references used for a draft so a reviewer can check the original material.`,
  `- Displays a 0.30–0.85 review signal derived from citation count; every reply requires human approval before sending.`,
  `- The agent can recommend human handoff for urgent, tax-judgment, or weak-knowledge cases; the score alone does not route a case.`,
  `- Multi-turn context across messages in the same email thread.`,
  `- Can read relevant freee accounting data through a read-only integration; it does not write to freee.`,
  ``,
  `## Safety and data handling`,
  `- 12-digit number patterns in inquiry bodies and parsed attachment text are masked; subject lines are currently outside this masking path.`,
  `- Access to inquiry and knowledge data is scoped by office tenant.`,
  `- Send and reject actions are written to an audit trail.`,
  `- The service uses a pooled multi-tenant architecture and external cloud/AI subprocessors.`,
  `- Screens, names, source counts, confidence values, and conversations shown on the site are fictional samples.`,
  ``,
  `## Key links`,
  `- Landing page: ${SITE_URL}/`,
  `- Product app: ${APP_URL}`,
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
