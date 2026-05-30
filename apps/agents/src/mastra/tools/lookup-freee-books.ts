import { createTool } from '@mastra/core/tools';
import { maskMyNumber } from '@zeiro/core';
import { TenantIsolationError } from '@zeiro/core/errors';
import { recordAudit } from '@zeiro/db';
import {
  ClientBindingMissingError,
  FreeeApiClient,
  IntegrationNotConnectedError,
  IntegrationRevokedError,
  RateLimitError,
  TokenRefreshError,
} from '@zeiro/integrations';
import { z } from 'zod';

// Agent-driven freee reads run as the system actor; we audit WHO (system, on
// behalf of the firm) accessed WHICH client's books and HOW MUCH — never the
// transaction contents (税理士法 §38).
const SYSTEM_ACTOR = '00000000-0000-0000-0000-000000000000';

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
  scope: z.enum(['recent_transactions', 'partners']),
  daysBack: z.number().int().min(1).max(365).default(90),
  limit: z.number().int().min(1).max(50).default(10),
  partnerNameContains: z.string().optional(),
});

const outputSchema = z.object({
  ok: z.boolean(),
  reason: z.enum(['no_integration', 'no_binding', 'revoked', 'needs_reconnect', 'rate_limited', 'error']).optional(),
  message: z.string().optional(),
  data: z.unknown().optional(),
});

export const lookupFreeeBooksTool = createTool({
  id: 'lookup-freee-books',
  description:
    '顧問先の freee 会計データを取得する。問い合わせで具体的な金額・取引・取引先名が言及されている場合に呼ぶ。事務所の freee 連携と顧問先の事業所紐付けが両方必要 — 未設定の場合は ok:false を返すので、その場合は escalate を呼ぶこと。',
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
        const deals = await client.listRecentDeals({
          daysBack: input.daysBack ?? 90,
          limit: input.limit ?? 10,
        });
        await auditAccess(firmId, clientId, 'recent_transactions', deals.length);
        return {
          ok: true,
          data: { deals: deals.map(redactDeal) },
        };
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

function redactDeal(d: { id: number; issue_date: string; amount: number; type: string; status: string; partner_id: number | null; ref_number: string | null; details?: Array<{ account_item_id: number; amount: number; description: string | null }> }) {
  return {
    id: d.id,
    issue_date: d.issue_date,
    amount: d.amount,
    type: d.type,
    status: d.status,
    partner_id: d.partner_id,
    ref_number: d.ref_number,
    details: d.details?.map((x) => ({
      account_item_id: x.account_item_id,
      amount: x.amount,
      description: x.description ? maskMyNumber(x.description).masked : null,
    })),
  };
}

function redactPartner(p: { id: number; name: string; shortcut1: string | null; contact_name: string | null }) {
  return {
    id: p.id,
    name: maskMyNumber(p.name).masked,
    shortcut1: p.shortcut1,
    contact_name: p.contact_name ? maskMyNumber(p.contact_name).masked : null,
  };
}

function interpretError(e: unknown): {
  ok: false;
  reason: 'no_integration' | 'no_binding' | 'revoked' | 'needs_reconnect' | 'rate_limited' | 'error';
  message: string;
} {
  if (e instanceof IntegrationNotConnectedError) {
    return { ok: false, reason: 'no_integration', message: '事務所が freee と連携していません' };
  }
  if (e instanceof ClientBindingMissingError) {
    return { ok: false, reason: 'no_binding', message: 'この顧問先には freee 事業所が紐付いていません' };
  }
  if (e instanceof IntegrationRevokedError) {
    return { ok: false, reason: 'revoked', message: 'freee 連携が解除されています — 再連携が必要' };
  }
  if (e instanceof TokenRefreshError) {
    return { ok: false, reason: 'needs_reconnect', message: 'freee トークン更新失敗 — 再連携が必要' };
  }
  if (e instanceof RateLimitError) {
    return { ok: false, reason: 'rate_limited', message: `freee レート制限 (${e.retryAfterSec}秒後に再試行)` };
  }
  return { ok: false, reason: 'error', message: e instanceof Error ? e.message : String(e) };
}
