import { auth } from '@clerk/nextjs/server';
import { findUserByClerkUserId, getInquiry, listInquiries } from '@zeiro/db';
import { notFound } from 'next/navigation';
import { InboxListV2, type InboxItemView } from '@/components/inquiry-v2/inbox-list';
import { SidebarV2 } from '@/components/inquiry-v2/sidebar';
import { SidecarPlaceholder } from '@/components/inquiry-v2/sidecar-placeholder';
import { ThreadPlaceholder } from '@/components/inquiry-v2/thread-placeholder';
import { TopbarV2 } from '@/components/inquiry-v2/topbar';
import { requireFirmContext } from '@/lib/firm-context';
import '../../../styles/inquiry-v2-design.css';

type SearchParams = {
  filter?: string;
  channel?: string;
  lifecycle?: string;
  category?: string;
};

const CATEGORY_TO_ID: Record<string, string> = {
  期日確認: 'deadline',
  書類提出: 'docs',
  税務質問: 'tax',
  顧問契約: 'contract',
  その他: 'other',
};

export default async function InquiryV2Page({
  params,
  searchParams,
}: {
  params: Promise<{ inquiryId: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { inquiryId } = await params;
  const sp = await searchParams;
  const { firmId } = await requireFirmContext();

  const [inquiry, allInquiries, session] = await Promise.all([
    getInquiry(firmId, inquiryId),
    listInquiries(firmId),
    auth(),
  ]);
  if (!inquiry) notFound();

  const meClerkId = session.userId;
  const meUser = meClerkId ? await findUserByClerkUserId(meClerkId) : null;
  const initials = meUser?.name ? toInitials(meUser.name) : 'SK';

  const filter = sp.filter ?? 'all';
  const channel = sp.channel ?? 'all';
  const lifecycle = sp.lifecycle ?? 'all';
  const category = sp.category ?? 'all';

  const items: InboxItemView[] = allInquiries.map((i) => {
    const analysis = (i.analysis ?? {}) as Record<string, unknown>;
    const triage = (analysis.triage ?? {}) as Record<string, unknown>;
    const categoryJp = typeof triage.category === 'string' ? triage.category : 'その他';
    const catId =
      (CATEGORY_TO_ID[categoryJp] as InboxItemView['category'] | undefined) ?? 'other';
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

  const filtered = items.filter((it) => {
    if (filter === 'unread' && !it.unread) return false;
    if (filter === 'draft' && it.unread) return false;
    if (filter === 'escalated' && it.confidence > 0.7) return false;
    if (filter === 'sent' && it.lifecycle !== 'resolved') return false;
    if (channel !== 'all' && it.channel !== channel) return false;
    if (lifecycle !== 'all' && it.lifecycle !== lifecycle) return false;
    if (category !== 'all' && it.category !== category) return false;
    return true;
  });

  const counts = {
    all: items.length,
    unread: items.filter((i) => i.unread).length,
    draft: items.filter((i) => !i.unread).length,
    escalated: items.filter((i) => i.confidence <= 0.7).length,
    sent: items.filter((i) => i.lifecycle === 'resolved').length,
    byChannel: items.reduce(
      (acc, i) => {
        acc[i.channel] = (acc[i.channel] ?? 0) + 1;
        return acc;
      },
      {} as Record<'email' | 'form' | 'line', number>,
    ),
  };
  const escalationRate = counts.all === 0 ? 0 : Math.round((counts.escalated / counts.all) * 100);

  const inqAnalysis = (inquiry.analysis ?? {}) as Record<string, unknown>;
  const inqTriage = (inqAnalysis.triage ?? {}) as Record<string, unknown>;
  const senderName = inquiry.client?.name ?? inquiry.unmatchedSender ?? 'Unknown';

  const sortedSearch = buildSearchString({ filter, channel, lifecycle, category });

  return (
    <div className="zeiro-v2" data-theme="light">
      <div className="app">
        <TopbarV2 unreadCount={counts.unread} activeTab="inbox" userInitials={initials} />
        <div className="tab-stage">
          <div className="workspace">
            <SidebarV2
              counts={counts}
              escalationRate={escalationRate}
              filter={filter}
              channel={channel}
              lifecycle={lifecycle}
              category={category}
            />
            <InboxListV2
              inquiries={filtered}
              totalCount={items.length}
              selectedId={inquiry.id}
              searchParams={sortedSearch}
            />
            <ThreadPlaceholder
              inquiry={{
                id: inquiry.id,
                subject: inquiry.subject,
                body: inquiry.body,
                receivedAt: inquiry.receivedAt.toISOString(),
                senderName,
                senderRole: '',
                senderCompany: inquiry.client?.name ?? '',
                senderInitials: toInitials(senderName),
                category:
                  (CATEGORY_TO_ID[
                    typeof inqTriage.category === 'string' ? inqTriage.category : 'その他'
                  ] as string) ?? 'other',
              }}
            />
            <SidecarPlaceholder />
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

function buildSearchString(p: { filter: string; channel: string; lifecycle: string; category: string }): string {
  const q = new URLSearchParams();
  if (p.filter !== 'all') q.set('filter', p.filter);
  if (p.channel !== 'all') q.set('channel', p.channel);
  if (p.lifecycle !== 'all') q.set('lifecycle', p.lifecycle);
  if (p.category !== 'all') q.set('category', p.category);
  const s = q.toString();
  return s ? `?${s}` : '';
}
