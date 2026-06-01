import { createTool } from '@mastra/core/tools';
import { SYSTEM_ACTOR_ID as SYSTEM_ACTOR } from '@zeiro/core';
import { TenantIsolationError } from '@zeiro/core/errors';
import { recordAudit } from '@zeiro/db';
import { FreeeApiClient } from '@zeiro/integrations';
import { z } from 'zod';
import { interpretError, redactDeal, redactInvoice, redactPartner } from './freee-redact';

// Agent-driven freee reads run as the system actor; we audit WHO (system, on
// behalf of the firm) accessed WHICH client's books and HOW MUCH — never the
// transaction contents (税理士法 §38).

async function auditAccess(firmId: string, clientId: string, scope: string, rows: number) {
  await recordAudit({
    firmId,
    actorId: SYSTEM_ACTOR,
    inquiryId: null,
    action: 'integration.freee_data_accessed',
    metadata: { provider: 'freee', clientId, scope, rows },
  });
}

const inputSchema = z.object({
  scope: z.enum(['recent_transactions', 'partners', 'invoices', 'profit_loss']),
  daysBack: z.number().int().min(1).max(365).default(90),
  limit: z.number().int().min(1).max(50).default(10),
  partnerNameContains: z.string().optional(),
  unpaidOnly: z.boolean().optional(),
});

const outputSchema = z.object({
  ok: z.boolean(),
  reason: z
    .enum(['no_integration', 'no_binding', 'revoked', 'needs_reconnect', 'rate_limited', 'error'])
    .optional(),
  message: z.string().optional(),
  data: z.unknown().optional(),
});

export const lookupFreeeBooksTool = createTool({
  id: 'lookup-freee-books',
  description:
    '顧問先の freee 会計データを取得する。scope: recent_transactions(取引), partners(取引先), invoices(請求書・入金状況), profit_loss(月次の売上・費用・利益)。問い合わせで具体的な金額・取引・取引先・請求書・入金状況・業績が言及されている場合に呼ぶ。事務所の freee 連携と顧問先の事業所紐付けが両方必要 — 未設定の場合は ok:false を返すので、その場合は escalate を呼ぶこと。',
  inputSchema,
  outputSchema,
  execute: async (input, ctx) => {
    const firmId = ctx?.requestContext?.get('firmId');
    const clientId = ctx?.requestContext?.get('clientId');
    if (typeof firmId !== 'string') {
      throw new TenantIsolationError('lookup-freee-books invoked without firmId');
    }
    if (typeof clientId !== 'string') {
      return {
        ok: false,
        reason: 'no_binding' as const,
        message: 'この問い合わせには顧問先が紐付いていないため freee からの取得は不可',
      };
    }

    try {
      const client = await FreeeApiClient.forClient(firmId, clientId);

      if (input.scope === 'recent_transactions') {
        const [deals, names] = await Promise.all([
          client.listRecentDeals({ daysBack: input.daysBack ?? 90, limit: input.limit ?? 10 }),
          client.accountItemNames().catch(() => undefined),
        ]);
        await auditAccess(firmId, clientId, 'recent_transactions', deals.length);
        return { ok: true, data: { deals: deals.map((d) => redactDeal(d, names)) } };
      }

      if (input.scope === 'invoices') {
        const invoices = await client.listInvoices({
          limit: input.limit ?? 10,
          ...(input.unpaidOnly ? { unpaidOnly: true } : {}),
        });
        await auditAccess(
          firmId,
          clientId,
          input.unpaidOnly ? 'invoices_unpaid' : 'invoices',
          invoices.length,
        );
        return { ok: true, data: { invoices: invoices.map(redactInvoice) } };
      }

      if (input.scope === 'profit_loss') {
        const pl = await client.profitAndLoss();
        await auditAccess(firmId, clientId, 'profit_loss', pl.lines.length);
        return { ok: true, data: { profitLoss: pl } };
      }

      // partners scope
      if (input.partnerNameContains) {
        const partner = await client.findPartnerByName(input.partnerNameContains);
        await auditAccess(firmId, clientId, 'partner_search', partner ? 1 : 0);
        return { ok: true, data: { partner: partner ? redactPartner(partner) : null } };
      }
      const partners = await client.listPartners({ limit: input.limit ?? 10 });
      await auditAccess(firmId, clientId, 'partners', partners.length);
      return { ok: true, data: { partners: partners.map(redactPartner) } };
    } catch (e) {
      return interpretError(e);
    }
  },
});
