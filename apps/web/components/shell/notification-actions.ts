'use server';

import { listInquiryThreads } from '@zeiro/db';
import { viewerScope } from '@/lib/authz';
import { requireFirmContext } from '@/lib/firm-context';

export type AttentionItem = {
  id: string;
  subject: string;
  client: string;
  status: 'escalated' | 'pending' | 'unmatched';
};

// What the bell surfaces: inquiries that genuinely need a human — escalations,
// unmatched senders to triage, and anything still awaiting first processing —
// scoped to what the viewer is allowed to see.
export async function listAttentionItems(): Promise<AttentionItem[]> {
  const ctx = await requireFirmContext();
  const threads = await listInquiryThreads(ctx.firmId, undefined, viewerScope(ctx));
  const rank: Record<string, number> = { escalated: 0, unmatched: 1, pending: 2 };
  return threads
    .filter((t) => t.status === 'escalated' || t.status === 'unmatched' || t.status === 'pending')
    .sort((a, b) => (rank[a.status] ?? 9) - (rank[b.status] ?? 9))
    .slice(0, 8)
    .map((t) => ({
      id: t.id,
      subject: t.subject || '(件名なし)',
      client: t.client?.name ?? t.unmatchedSender ?? '(未登録)',
      status: t.status as AttentionItem['status'],
    }));
}
