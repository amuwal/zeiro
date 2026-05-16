/**
 * Direct REST API smoke test for freee.
 * Run after putting credentials in scripts/freee/.env.local:
 *   pnpm tsx scripts/freee/test-http.ts
 *
 * Verifies the four endpoints we'll likely wrap as the agent's lookup tool:
 *   /api/1/companies               — confirms token + lists 事業所 the token has access to
 *   /api/1/deals                   — transactions (the bulk of what an AI would query)
 *   /api/1/partners                — 顧客 / 取引先 lookup
 *   /api/1/invoices                — issued invoices (if 請求書 plan enabled)
 */
import { companyId, env, freee, FreeeApiError, logKV, logSection } from './lib';

type Company = { id: number; name: string; name_kana: string | null; role: string };
type Deal = {
  id: number;
  issue_date: string;
  amount: number;
  type: 'income' | 'expense';
  status: string;
  partner_id: number | null;
  ref_number: string | null;
};
type Partner = {
  id: number;
  name: string;
  shortcut1: string | null;
  email: string | null;
};
type Invoice = {
  id: number;
  invoice_number: string;
  partner_name: string;
  total_amount: number;
  issue_date: string;
  due_date: string | null;
  invoice_status: string;
};

async function main() {
  const t0 = Date.now();

  logSection('1. /api/1/companies — token sanity check');
  const companies = await freee<{ companies: Company[] }>('GET', '/api/1/companies');
  for (const c of companies.companies) {
    logKV(c.role === 'admin' ? '* (active)' : '  ', `${c.id}  ${c.name}`);
  }
  const target = companies.companies.find((c) => c.id === companyId);
  if (!target) {
    throw new Error(
      `FREEE_COMPANY_ID=${companyId} not visible to this token. Visible: ${companies.companies.map((c) => c.id).join(', ')}`,
    );
  }
  logKV('chosen company', `${target.id} ${target.name} (${target.role})`);

  logSection('2. /api/1/deals — last 90 days of transactions');
  const since = new Date();
  since.setDate(since.getDate() - 90);
  const deals = await freee<{ deals: Deal[] }>('GET', '/api/1/deals', undefined, {
    company_id: companyId,
    start_issue_date: since.toISOString().slice(0, 10),
    limit: 20,
  });
  logKV('count', deals.deals.length);
  for (const d of deals.deals.slice(0, 5)) {
    logKV(`  ${d.issue_date}`, `${d.type === 'income' ? '+' : '-'}¥${d.amount.toLocaleString()}  ${d.ref_number ?? ''}`);
  }

  logSection('3. /api/1/partners — 取引先 list');
  const partners = await freee<{ partners: Partner[] }>('GET', '/api/1/partners', undefined, {
    company_id: companyId,
    limit: 10,
  });
  logKV('count', partners.partners.length);
  for (const p of partners.partners.slice(0, 5)) {
    logKV(`  #${p.id}`, p.name);
  }

  logSection('4. /api/1/invoices — issued invoices (請求書 API)');
  try {
    const invoices = await freee<{ invoices: Invoice[] }>('GET', '/api/1/invoices', undefined, {
      company_id: companyId,
      limit: 5,
    });
    logKV('count', invoices.invoices.length);
    for (const inv of invoices.invoices.slice(0, 3)) {
      logKV(`  ${inv.invoice_number}`, `¥${inv.total_amount.toLocaleString()}  ${inv.partner_name}  (${inv.invoice_status})`);
    }
  } catch (e) {
    if (e instanceof FreeeApiError && (e.status === 403 || e.status === 404)) {
      logKV('skipped', '請求書プランが有効でない可能性 (slice 2 では会計のみで OK)');
    } else {
      throw e;
    }
  }

  logSection(`done in ${Date.now() - t0}ms — token=${env.FREEE_ACCESS_TOKEN.slice(0, 8)}…`);
}

main().catch((e) => {
  // biome-ignore lint/suspicious/noConsole: throwaway script
  console.error('\n[test-http] FAILED:', e instanceof FreeeApiError ? e.message : e);
  process.exit(1);
});
