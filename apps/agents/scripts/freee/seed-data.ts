/**
 * Idempotent data seeder for a freee test 事業所.
 * Populates: 5 partners (取引先), 12 recent 取引 spanning income/expense, 2 invoice-shaped sales.
 * Re-run safe: uses shortcut1 = "zeiro-seed-<key>" as the dedup tag.
 *
 *   pnpm tsx scripts/freee/seed-data.ts
 *
 * Requires `write` scope on the access token. If you only granted `read`, the
 * partner POSTs will 403 and you should either re-OAuth with write or seed
 * manually via the freee UI.
 */
import { companyId, freee, FreeeApiError, jpyDate, logKV, logSection } from './lib';

const SEED_TAG = 'zeiro-seed';

type PartnerSeed = {
  key: string;
  name: string;
  email?: string;
  payerPayee: 'customer' | 'supplier' | 'both';
};

const PARTNERS: PartnerSeed[] = [
  { key: 'mirai-tech', name: '合同会社みらいテック', email: 'mirai-tech@example.co.jp', payerPayee: 'customer' },
  { key: 'sakura-clinic', name: '佐藤クリニック', email: 'sato@sato-clinic.jp', payerPayee: 'customer' },
  { key: 'yamada-shoji', name: '株式会社山田商事', email: 'yamada@yamada-shoji.co.jp', payerPayee: 'customer' },
  { key: 'office-rent', name: 'ヤマダ不動産 (賃貸)', payerPayee: 'supplier' },
  { key: 'cloud-saas', name: 'AWS Japan', payerPayee: 'supplier' },
];

type DealSeed = {
  type: 'income' | 'expense';
  daysAgo: number;
  partnerKey: string;
  amount: number;
  description: string;
  account: string;
};

// Realistic SMB month: monthly recurring (rent, SaaS), a few invoices to
// customers, occasional one-off purchases. Spread over the last 90 days.
const DEALS: DealSeed[] = [
  // Recurring outgoings
  { type: 'expense', daysAgo: 5, partnerKey: 'office-rent', amount: 180000, description: '事務所家賃 (今月)', account: '地代家賃' },
  { type: 'expense', daysAgo: 8, partnerKey: 'cloud-saas', amount: 47800, description: 'AWS 利用料', account: '通信費' },
  { type: 'expense', daysAgo: 35, partnerKey: 'office-rent', amount: 180000, description: '事務所家賃 (先月)', account: '地代家賃' },
  { type: 'expense', daysAgo: 38, partnerKey: 'cloud-saas', amount: 52100, description: 'AWS 利用料 (先月)', account: '通信費' },
  { type: 'expense', daysAgo: 65, partnerKey: 'office-rent', amount: 180000, description: '事務所家賃 (前々月)', account: '地代家賃' },
  { type: 'expense', daysAgo: 68, partnerKey: 'cloud-saas', amount: 49500, description: 'AWS 利用料 (前々月)', account: '通信費' },
  // Sales (income)
  { type: 'income', daysAgo: 12, partnerKey: 'mirai-tech', amount: 660000, description: 'システム開発 11月分', account: '売上高' },
  { type: 'income', daysAgo: 18, partnerKey: 'sakura-clinic', amount: 88000, description: 'IT サポート 月額', account: '売上高' },
  { type: 'income', daysAgo: 22, partnerKey: 'yamada-shoji', amount: 330000, description: 'コンサルティング 11月', account: '売上高' },
  { type: 'income', daysAgo: 48, partnerKey: 'mirai-tech', amount: 660000, description: 'システム開発 10月分', account: '売上高' },
  { type: 'income', daysAgo: 50, partnerKey: 'sakura-clinic', amount: 88000, description: 'IT サポート 月額 (10月)', account: '売上高' },
  { type: 'income', daysAgo: 55, partnerKey: 'yamada-shoji', amount: 275000, description: 'コンサルティング 10月', account: '売上高' },
];

type Partner = { id: number; name: string; shortcut1: string | null };
type AccountItem = { id: number; name: string };
type Deal = { id: number; issue_date: string; amount: number };

async function findOrCreatePartner(seed: PartnerSeed, existing: Partner[]): Promise<number> {
  const shortcut = `${SEED_TAG}-${seed.key}`;
  const match = existing.find((p) => p.shortcut1 === shortcut);
  if (match) {
    logKV(`  partner=${seed.key}`, `exists #${match.id}`);
    return match.id;
  }
  const created = await freee<{ partner: Partner }>('POST', '/api/1/partners', {
    company_id: companyId,
    name: seed.name,
    shortcut1: shortcut,
    ...(seed.email ? { contact_name: seed.email } : {}),
  });
  logKV(`  partner=${seed.key}`, `created #${created.partner.id}`);
  return created.partner.id;
}

async function findAccountItemByName(items: AccountItem[], name: string): Promise<number> {
  const match = items.find((i) => i.name === name);
  if (!match) {
    throw new Error(`account_item not found: ${name}. freee 事業所 may not have the default chart of accounts.`);
  }
  return match.id;
}

async function createDealIfMissing(
  seed: DealSeed,
  partnerId: number,
  accountItemId: number,
  existingDeals: Deal[],
): Promise<void> {
  const date = new Date();
  date.setDate(date.getDate() - seed.daysAgo);
  const issueDate = jpyDate(date);
  // freee 管理番号 is capped at 20 chars. Use a compact tag — first 6 chars of
  // partner key + days-ago suffix keeps us well under the limit and still
  // dedup-stable for re-runs.
  const refNumber = `zs-${seed.partnerKey.slice(0, 6)}-${seed.daysAgo}d`;

  // Dedup by ref_number — freee allows custom ref values per deal.
  const dup = existingDeals.find((d) => (d as Deal & { ref_number?: string }).ref_number === refNumber);
  if (dup) {
    logKV(`  deal=${seed.daysAgo}d`, `exists #${dup.id} ${seed.description}`);
    return;
  }

  const created = await freee<{ deal: Deal }>('POST', '/api/1/deals', {
    company_id: companyId,
    issue_date: issueDate,
    type: seed.type,
    partner_id: partnerId,
    ref_number: refNumber,
    details: [
      {
        account_item_id: accountItemId,
        tax_code: 0,
        amount: seed.amount,
        description: seed.description,
      },
    ],
  });
  logKV(`  deal=${seed.daysAgo}d`, `created #${created.deal.id} ${seed.type} ¥${seed.amount.toLocaleString()} ${seed.description}`);
}

async function main() {
  logSection('1. fetch existing state');
  const [partnersRes, accountsRes, dealsRes] = await Promise.all([
    freee<{ partners: Partner[] }>('GET', '/api/1/partners', undefined, { company_id: companyId, limit: 100 }),
    freee<{ account_items: AccountItem[] }>('GET', '/api/1/account_items', undefined, { company_id: companyId }),
    freee<{ deals: Deal[] }>('GET', '/api/1/deals', undefined, { company_id: companyId, limit: 100 }),
  ]);
  logKV('partners', partnersRes.partners.length);
  logKV('account_items', accountsRes.account_items.length);
  logKV('deals', dealsRes.deals.length);

  logSection('2. ensure partners');
  const partnerIds = new Map<string, number>();
  for (const seed of PARTNERS) {
    partnerIds.set(seed.key, await findOrCreatePartner(seed, partnersRes.partners));
  }

  logSection('3. ensure deals');
  for (const seed of DEALS) {
    const pid = partnerIds.get(seed.partnerKey);
    if (!pid) throw new Error(`partner missing for ${seed.partnerKey}`);
    const accountItemId = await findAccountItemByName(accountsRes.account_items, seed.account);
    await createDealIfMissing(seed, pid, accountItemId, dealsRes.deals);
  }

  logSection('done. re-run anytime — already-seeded rows skip.');
}

main().catch((e) => {
  // biome-ignore lint/suspicious/noConsole: throwaway script
  console.error('\n[seed-data] FAILED:', e instanceof FreeeApiError ? e.message : e);
  process.exit(1);
});
