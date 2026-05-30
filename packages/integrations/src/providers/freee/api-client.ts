import { getBindingByClient } from '@zeiro/db';
import {
  ClientBindingMissingError,
  IntegrationRevokedError,
  RateLimitError,
} from '../../core/errors';
import { getAdapter } from '../../core/registry';
import type {
  FreeeAccountItem,
  FreeeCompanyMini,
  FreeeDeal,
  FreeeInvoice,
  FreeePartner,
  FreeeProfitAndLoss,
  FreeeTrialBalanceLine,
} from './types';

export type {
  FreeeCompanyMini,
  FreeeDeal,
  FreeeInvoice,
  FreeePartner,
  FreeeProfitAndLoss,
} from './types';

const FREEE_API = 'https://api.freee.co.jp';

export class FreeeApiClient {
  constructor(
    private readonly firmId: string,
    private readonly companyId: string,
  ) {}

  static async forClient(firmId: string, clientId: string): Promise<FreeeApiClient> {
    const binding = await getBindingByClient(firmId, clientId, 'freee');
    if (!binding) throw new ClientBindingMissingError(clientId, 'freee');
    return new FreeeApiClient(firmId, binding.externalId);
  }

  async listCompanies(): Promise<FreeeCompanyMini[]> {
    const json = await this.get<{ companies: FreeeCompanyMini[] }>('/api/1/companies');
    return json.companies;
  }

  async listRecentDeals(opts: { daysBack?: number; limit?: number } = {}): Promise<FreeeDeal[]> {
    const since = new Date();
    since.setDate(since.getDate() - (opts.daysBack ?? 90));
    const json = await this.get<{ deals: FreeeDeal[] }>('/api/1/deals', {
      company_id: this.companyId,
      start_issue_date: since.toISOString().slice(0, 10),
      limit: String(opts.limit ?? 20),
    });
    return json.deals;
  }

  async listPartners(opts: { limit?: number } = {}): Promise<FreeePartner[]> {
    const json = await this.get<{ partners: FreeePartner[] }>('/api/1/partners', {
      company_id: this.companyId,
      limit: String(opts.limit ?? 50),
    });
    return json.partners;
  }

  async findPartnerByName(name: string): Promise<FreeePartner | null> {
    const partners = await this.listPartners({ limit: 100 });
    const target = partners.find(
      (p) => p.name.includes(name) || (p.shortcut1 ?? '').includes(name),
    );
    return target ?? null;
  }

  async listInvoices(opts: { limit?: number; unpaidOnly?: boolean } = {}): Promise<FreeeInvoice[]> {
    const query: Record<string, string> = {
      company_id: this.companyId,
      limit: String(opts.limit ?? 20),
    };
    if (opts.unpaidOnly) query.payment_status = 'unsettled';
    const json = await this.get<{ invoices: FreeeInvoice[] }>('/api/1/invoices', query);
    return json.invoices;
  }

  // Maps account_item_id → name so transaction lines read as 勘定科目 names in
  // citations instead of opaque numeric ids.
  async accountItemNames(): Promise<Map<number, string>> {
    const json = await this.get<{ account_items: FreeeAccountItem[] }>('/api/1/account_items', {
      company_id: this.companyId,
    });
    return new Map(json.account_items.map((a) => [a.id, a.name]));
  }

  // Current-period P/L summary (omitting fiscal_year defaults to the company's
  // current fiscal year). Returns only non-zero lines so the agent gets a compact
  // 売上/費用/利益 picture rather than the full chart of accounts.
  async profitAndLoss(): Promise<FreeeProfitAndLoss> {
    const json = await this.get<{
      trial_pl: {
        fiscal_year?: number;
        start_month?: number;
        end_month?: number;
        balances?: FreeeTrialBalanceLine[];
      };
    }>('/api/1/reports/trial_pl', { company_id: this.companyId });
    const pl = json.trial_pl;
    const lines = (pl.balances ?? [])
      .filter((b) => b.closing_balance !== 0 && b.account_item_name)
      .map((b) => ({ name: b.account_item_name, balance: b.closing_balance }));
    return {
      fiscalYear: pl.fiscal_year ?? null,
      startMonth: pl.start_month ?? null,
      endMonth: pl.end_month ?? null,
      lines,
    };
  }

  private async get<T>(path: string, query?: Record<string, string>): Promise<T> {
    const url = new URL(`${FREEE_API}${path}`);
    if (query) for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);

    const adapter = getAdapter('freee');
    let token = await adapter.getAccessToken(this.firmId);
    let res = await this.fetchWithToken(url, token);

    if (res.status === 401) {
      token = await adapter.getAccessToken(this.firmId);
      res = await this.fetchWithToken(url, token);
      if (res.status === 401) {
        const { markIntegrationStatus, findIntegration } = await import('@zeiro/db');
        const row = await findIntegration(this.firmId, 'freee');
        if (row) {
          await markIntegrationStatus(
            this.firmId,
            row.id,
            'revoked',
            'persistent 401 after refresh',
          );
        }
        throw new IntegrationRevokedError(row?.id ?? '?', 'freee');
      }
    }

    if (res.status === 429) {
      const retryAfter = Number(res.headers.get('retry-after') ?? '60');
      throw new RateLimitError('freee', Number.isFinite(retryAfter) ? retryAfter : 60);
    }

    if (!res.ok) {
      throw new Error(`freee GET ${path} → ${res.status}: ${(await res.text()).slice(0, 200)}`);
    }
    return (await res.json()) as T;
  }

  private fetchWithToken(url: URL, token: string): Promise<Response> {
    return fetch(url.toString(), {
      headers: {
        authorization: `Bearer ${token}`,
        accept: 'application/json',
        'X-Api-Version': '2020-06-15',
      },
    });
  }
}
