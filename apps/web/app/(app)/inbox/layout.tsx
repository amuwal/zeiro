import { listInquiryThreads } from '@zeiro/db';
import type { ReactNode } from 'react';
import type { InboxItemView } from '@/components/inquiry/inbox-list';
import { InboxShell } from '@/components/inquiry/shell';
import { requireFirmContext } from '@/lib/firm-context';
import { CATEGORY_TO_ID, normalizeChannel, shortTime } from '@/lib/inquiry-mappers';

export default async function InboxLayout({ children }: { children: ReactNode }) {
  const { firmId } = await requireFirmContext();
  // listInquiryThreads returns ONE row per conversation (the leaf — i.e. the
  // newest message in each parent_inquiry_id chain), with a `threadCount`
  // attached. Raw listInquiries would surface every reply as its own list
  // entry and inflate every count.
  const threads = await listInquiryThreads(firmId);

  const items: InboxItemView[] = threads.map((i) => {
    const analysis = (i.analysis ?? {}) as Record<string, unknown>;
    const triage = (analysis.triage ?? {}) as Record<string, unknown>;
    const categoryJp = typeof triage.category === 'string' ? triage.category : 'その他';
    const catId = CATEGORY_TO_ID[categoryJp] ?? 'other';
    const confidence = typeof triage.confidence === 'number' ? triage.confidence : 0.5;
    return {
      id: i.id,
      channel: normalizeChannel(i.channel),
      company: i.client?.name ?? i.unmatchedSender ?? '(未登録)',
      subject: i.subject,
      preview: i.body.replace(/\s+/g, ' ').slice(0, 90),
      received: shortTime(i.receivedAt),
      urgent: triage.urgency === 'high',
      unread: i.status === 'pending',
      category: catId,
      confidence,
      lifecycle: i.status === 'sent' ? ('resolved' as const) : ('open' as const),
      ...(i.threadCount > 1 ? { turnCount: i.threadCount } : {}),
    };
  });

  return (
    <div className="tab-stage">
      <div className="workspace">
        <InboxShell items={items}>{children}</InboxShell>
      </div>
    </div>
  );
}
