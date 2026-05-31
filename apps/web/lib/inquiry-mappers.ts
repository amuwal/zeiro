import type { ClientProfile } from '@zeiro/core';
import type { InboxItemView } from '@/components/inquiry/inbox-list';
import type { ClientTabData } from '@/components/inquiry/sidecar-tabs/client-tab';
import type { SourceItem } from '@/components/inquiry/sidecar-tabs/sources-tab';

export const CATEGORY_TO_ID: Record<string, InboxItemView['category']> = {
  期日確認: 'deadline',
  書類提出: 'docs',
  税務質問: 'tax',
  顧問契約: 'contract',
  その他: 'other',
};

export type TriageView = {
  category: string;
  confidence: number;
  urgency: string;
  requiresTaxJudgment: boolean;
};

// The inquiry `analysis` JSONB is written FLAT by the pipeline (process-draft.ts
// analysisFromResult + lib/inngest onFailure both emit { category, confidence,
// urgency, ... } at the top level). Read it flat here; the nested `triage.*`
// form is only a fallback for any legacy rows. The defaults apply solely to
// pre-draft (empty) analysis — once drafted, the real model values show.
export function readTriage(analysis: unknown): TriageView {
  const a = (analysis ?? {}) as Record<string, unknown>;
  const t =
    a.triage && typeof a.triage === 'object' ? (a.triage as Record<string, unknown>) : a;
  return {
    category: typeof t.category === 'string' ? t.category : 'その他',
    confidence: typeof t.confidence === 'number' ? t.confidence : 0.5,
    urgency: typeof t.urgency === 'string' ? t.urgency : 'medium',
    requiresTaxJudgment: t.requiresTaxJudgment === true,
  };
}

export function normalizeChannel(raw: string | null | undefined): InboxItemView['channel'] {
  switch (raw) {
    case 'email':
      return 'email';
    case 'line':
      return 'line';
    case 'chatwork':
      return 'chatwork';
    case 'form':
    case 'web':
    case 'webform':
      return 'form';
    default:
      return 'email';
  }
}

export type ClientDetail = {
  id: string;
  name: string;
  contractType: string;
  inquiryCount: number;
  notes: string | null;
  profile?: ClientProfile | null;
};

const CONTRACT_LABEL: Record<string, string> = {
  monthly: '顧問契約',
  spot: 'スポット',
  prospect: '見込み客',
  unverified: '未確認',
};
const ENTITY_LABEL: Record<string, string> = {
  corporation: '法人',
  sole_proprietor: '個人事業主',
};
const CONSUMPTION_TAX_LABEL: Record<string, string> = {
  taxable: '課税事業者',
  simplified: '簡易課税',
  exempt: '免税事業者',
};

// Build the kv rows shown in the sidecar — only fields the firm has actually set,
// so the reviewer sees exactly the same context the drafting agent used (and
// blanks read as "unset" rather than fabricated zeros).
function profileRows(p: ClientProfile | null | undefined): Array<{ k: string; v: string }> {
  if (!p) return [];
  const rows: Array<{ k: string; v: string }> = [];
  if (typeof p.monthlyFee === 'number') {
    rows.push({ k: '顧問料', v: `¥${p.monthlyFee.toLocaleString()}/月` });
  }
  if (typeof p.fiscalMonth === 'number') rows.push({ k: '決算月', v: `${p.fiscalMonth}月` });
  if (p.entityType) rows.push({ k: '事業形態', v: ENTITY_LABEL[p.entityType] ?? p.entityType });
  if (p.consumptionTax) {
    rows.push({ k: '消費税', v: CONSUMPTION_TAX_LABEL[p.consumptionTax] ?? p.consumptionTax });
  }
  if (typeof p.invoiceRegistered === 'boolean') {
    rows.push({ k: 'インボイス', v: p.invoiceRegistered ? '登録済' : '未登録' });
  }
  if (typeof p.withholding === 'boolean') {
    rows.push({ k: '源泉徴収', v: p.withholding ? 'あり' : 'なし' });
  }
  if (p.engagementScope) rows.push({ k: '契約範囲', v: p.engagementScope });
  return rows;
}

export function toClientTab(detail: ClientDetail | null): ClientTabData | null {
  if (!detail) return null;
  return {
    id: detail.id,
    initials: toInitials(detail.name),
    company: detail.name,
    contractLabel: CONTRACT_LABEL[detail.contractType] ?? detail.contractType,
    profileRows: profileRows(detail.profile),
    lifetimeInquiries: detail.inquiryCount,
    note: detail.notes ?? '',
  };
}

export function mapCitationsToSources(citations: unknown): SourceItem[] {
  const arr = Array.isArray(citations) ? citations : [];
  return arr.map((c, i) => {
    const cite = c as { source?: string; snippet?: string };
    const src = typeof cite.source === 'string' ? cite.source : '';
    const [sourceName, section] = src.includes('/')
      ? src.split('/').map((s) => s.trim())
      : [src, ''];
    return {
      id: `c${i + 1}`,
      title: typeof cite.snippet === 'string' ? cite.snippet.slice(0, 80) : src,
      src: sourceName ?? src,
      section: section ?? '',
      status: 'fresh' as const,
      score: 0.85 - i * 0.05,
    };
  });
}

type DraftLike = {
  body: string;
  citations: unknown;
  metadata?: unknown;
};

export function blocksFromDraft(draft: DraftLike): Array<{ text: string; cite: string | null }> {
  const metadata = (draft.metadata ?? {}) as Record<string, unknown>;
  const cb = metadata.citationBlocks;
  if (Array.isArray(cb) && cb.length > 0) {
    return cb
      .map((b) => {
        const obj = b as { text?: string; citationIndexes?: number[] };
        if (typeof obj.text !== 'string') return null;
        const idx = Array.isArray(obj.citationIndexes) ? obj.citationIndexes[0] : undefined;
        const cite = typeof idx === 'number' ? `c${idx + 1}` : null;
        return { text: obj.text, cite };
      })
      .filter((b): b is { text: string; cite: string | null } => b !== null);
  }
  return [{ text: draft.body, cite: null }];
}

export function toInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/[\s ]+/);
  const first = parts[0]?.[0] ?? '?';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

export function formatTime(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function shortTime(d: Date): string {
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min >= 60 * 24) return `${Math.floor(min / 60 / 24)}日`;
  if (min >= 60) return `${Math.floor(min / 60)}時間`;
  if (min >= 1) return `${min}分${sec}秒`;
  return `${sec}秒`;
}

export function deriveOpenItems(aiReview: Record<string, unknown>): string[] {
  const suggestions = aiReview.suggestions;
  if (Array.isArray(suggestions))
    return suggestions.filter((s): s is string => typeof s === 'string');
  const gaps = aiReview.gaps;
  if (Array.isArray(gaps)) return gaps.filter((s): s is string => typeof s === 'string');
  return [];
}
