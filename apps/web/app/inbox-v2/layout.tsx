import { auth } from '@clerk/nextjs/server';
import { findUserByClerkUserId, listInquiries } from '@zeiro/db';
import type { ReactNode } from 'react';
import { InboxListV2, type InboxItemView } from '@/components/inquiry-v2/inbox-list';
import { SidebarV2 } from '@/components/inquiry-v2/sidebar';
import { TopbarV2 } from '@/components/inquiry-v2/topbar';
import { requireFirmContext } from '@/lib/firm-context';
import '../../styles/inquiry-v2-design.css';

const CATEGORY_TO_ID: Record<string, InboxItemView['category']> = {
  期日確認: 'deadline',
  書類提出: 'docs',
  税務質問: 'tax',
  顧問契約: 'contract',
  その他: 'other',
};

// Layout persists across child route changes — navigating between inquiries
// only swaps {children}, leaving the Sidebar + InboxList mounted. Filter
// state lives in the URL; the Sidebar/InboxList read it via useSearchParams
// (client-side) so changing filters doesn't remount items either.
export default async function InboxV2Layout({ children }: { children: ReactNode }) {
  const { firmId } = await requireFirmContext();
  const [allInquiries, session] = await Promise.all([listInquiries(firmId), auth()]);
  const meUser = session.userId ? await findUserByClerkUserId(session.userId) : null;
  const initials = meUser?.name ? toInitials(meUser.name) : 'SK';

  const items: InboxItemView[] = allInquiries.map((i) => {
    const analysis = (i.analysis ?? {}) as Record<string, unknown>;
    const triage = (analysis.triage ?? {}) as Record<string, unknown>;
    const categoryJp = typeof triage.category === 'string' ? triage.category : 'その他';
    const catId = CATEGORY_TO_ID[categoryJp] ?? 'other';
    const confidence = typeof triage.confidence === 'number' ? triage.confidence : 0.5;
    return {
      id: i.id,
      channel: (i.channel as InboxItemView['channel']) || 'email',
      company: i.client?.name ?? i.unmatchedSender ?? '(未登録)',
      subject: i.subject,
      preview: i.body.replace(/\s+/g, ' ').slice(0, 90),
      received: shortTime(i.receivedAt),
      urgent: triage.urgency === 'high',
      unread: i.status === 'pending',
      category: catId,
      confidence,
      lifecycle: i.status === 'sent' ? ('resolved' as const) : ('open' as const),
    };
  });

  return (
    <div className="zeiro-v2" data-theme="light">
      <div className="app">
        <TopbarV2
          unreadCount={items.filter((i) => i.unread).length}
          activeTab="inbox"
          userInitials={initials}
        />
        <div className="tab-stage">
          <div className="workspace">
            <SidebarV2 items={items} />
            <InboxListV2 items={items} />
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function toInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/[\s ]+/);
  const first = parts[0]?.[0] ?? '?';
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
  return (first + last).toUpperCase();
}

function shortTime(d: Date): string {
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
