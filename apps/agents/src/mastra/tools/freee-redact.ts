import { maskMyNumber } from '@zeiro/core';
import {
  ClientBindingMissingError,
  type FreeeDeal,
  type FreeeInvoice,
  type FreeePartner,
  IntegrationNotConnectedError,
  IntegrationRevokedError,
  RateLimitError,
  TokenRefreshError,
} from '@zeiro/integrations';

// Transaction lines carry free-text descriptions that can contain My Number /
// account numbers — mask before the data reaches the LLM (税理士法 §38). `names`
// resolves account_item_id → 勘定科目 name so citations are human-readable.
export function redactDeal(d: FreeeDeal, names?: Map<number, string>) {
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
      account_item_name: names?.get(x.account_item_id) ?? null,
      amount: x.amount,
      description: x.description ? maskMyNumber(x.description).masked : null,
    })),
  };
}

export function redactPartner(p: FreeePartner) {
  return {
    id: p.id,
    name: maskMyNumber(p.name).masked,
    shortcut1: p.shortcut1,
    contact_name: p.contact_name ? maskMyNumber(p.contact_name).masked : null,
  };
}

export function redactInvoice(i: FreeeInvoice) {
  return {
    id: i.id,
    invoice_number: i.invoice_number,
    title: i.title ? maskMyNumber(i.title).masked : null,
    issue_date: i.issue_date,
    due_date: i.due_date,
    payment_date: i.payment_date,
    total_amount: i.total_amount,
    partner_id: i.partner_id,
    partner_name: i.partner_name ? maskMyNumber(i.partner_name).masked : null,
    invoice_status: i.invoice_status,
    payment_status: i.payment_status,
  };
}

type FreeeFailure = {
  ok: false;
  reason:
    | 'no_integration'
    | 'no_binding'
    | 'revoked'
    | 'needs_reconnect'
    | 'rate_limited'
    | 'error';
  message: string;
};

export function interpretError(e: unknown): FreeeFailure {
  if (e instanceof IntegrationNotConnectedError) {
    return { ok: false, reason: 'no_integration', message: '事務所が freee と連携していません' };
  }
  if (e instanceof ClientBindingMissingError) {
    return {
      ok: false,
      reason: 'no_binding',
      message: 'この顧問先には freee 事業所が紐付いていません',
    };
  }
  if (e instanceof IntegrationRevokedError) {
    return { ok: false, reason: 'revoked', message: 'freee 連携が解除されています — 再連携が必要' };
  }
  if (e instanceof TokenRefreshError) {
    return {
      ok: false,
      reason: 'needs_reconnect',
      message: 'freee トークン更新失敗 — 再連携が必要',
    };
  }
  if (e instanceof RateLimitError) {
    return {
      ok: false,
      reason: 'rate_limited',
      message: `freee レート制限 (${e.retryAfterSec}秒後に再試行)`,
    };
  }
  return { ok: false, reason: 'error', message: e instanceof Error ? e.message : String(e) };
}
