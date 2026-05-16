import { getDraftByInquiry, getFirm, getInquiry, listFirmUsers, walkThread } from '@zeiro/db';
import { notFound } from 'next/navigation';
import { AiAnalysis } from '@/components/detail/ai-analysis';
import { AiReviewCard } from '@/components/detail/ai-review-card';
import { ConversationTimeline } from '@/components/detail/conversation-timeline';
import { DetailHeader } from '@/components/detail/detail-header';
import { DraftReviewForm } from '@/components/detail/draft-review-form';
import { DraftingPoller } from '@/components/detail/drafting-poller';
import { EscalatedStateView } from '@/components/detail/escalated-state-view';
import { OriginalMessage } from '@/components/detail/original-message';
import { SentStateView } from '@/components/detail/sent-state-view';
import { UnmatchedBanner } from '@/components/detail/unmatched-banner';
import { requireFirmContext } from '@/lib/firm-context';
import { readAiReview, readFailureType, readReason, readSenderName } from '@/lib/inquiry-derived';
import { isAdminRole } from '@/lib/team';

type Params = { inquiryId: string };
type SearchParams = { promoted?: string };

export default async function InquiryDetailPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) {
  const { inquiryId } = await params;
  const { firmId, userId, role } = await requireFirmContext();

  const [inquiry, draft, firm, thread, members, query] = await Promise.all([
    getInquiry(firmId, inquiryId),
    getDraftByInquiry(inquiryId),
    getFirm(firmId),
    walkThread(firmId, inquiryId),
    listFirmUsers(firmId),
    searchParams,
  ]);

  if (!inquiry) notFound();

  const assigneeMembers = members.map((m) => ({ id: m.id, name: m.name, tier: m.tier }));
  // Admin can always reassign. The current assignee can hand it off. Everyone
  // else sees the badge read-only — the dropdown menu just doesn't open.
  const canReassign = isAdminRole(role) || inquiry.assignedToId === userId;

  const isEscalated = inquiry.status === 'escalated';
  const isPending = inquiry.status === 'pending';
  const isUnmatched = inquiry.status === 'unmatched';
  const isSent = inquiry.status === 'sent';
  const promotedCount = parsePromotedCount(query.promoted);
  const primaryDurationMin = draft
    ? (draft.createdAt.getTime() - inquiry.receivedAt.getTime()) / 60_000
    : null;

  if (isUnmatched) {
    return (
      <section className="detail-col" key={inquiry.id}>
        <DetailHeader inquiry={inquiry} members={assigneeMembers} canReassign={canReassign} />
        <div className="detail-body detail-anim">
          <UnmatchedBanner
            inquiryId={inquiry.id}
            fromAddress={inquiry.unmatchedSender ?? ''}
            fromName={readSenderName(inquiry)}
            subject={inquiry.subject}
          />
          <OriginalMessage inquiry={inquiry} firmInbound={firm.inboundAddress} />
        </div>
      </section>
    );
  }

  if (isSent) {
    return (
      <section className="detail-col" key={inquiry.id}>
        <DetailHeader inquiry={inquiry} members={assigneeMembers} canReassign={canReassign} />
        <SentStateView
          inquiryId={inquiry.id}
          thread={thread}
          firmName={firm.name}
          lastSentAt={lastSentAtFromThread(thread)}
        />
      </section>
    );
  }

  const aiReview = readAiReview(inquiry);

  // Escalated: no draft to send. Reviewer composes manually, with AI's review
  // (or a fallback escalation banner for legacy / pipeline-failure rows) in view.
  if (isEscalated) {
    return (
      <section className="detail-col" key={inquiry.id}>
        <DetailHeader inquiry={inquiry} members={assigneeMembers} canReassign={canReassign} />
        <EscalatedStateView
          inquiryId={inquiry.id}
          thread={thread}
          firmName={firm.name}
          aiReview={aiReview}
          fallbackReason={readReason(inquiry)}
          fallbackFailureType={readFailureType(inquiry)}
        />
      </section>
    );
  }

  return (
    <section className="detail-col" key={inquiry.id}>
      {isPending && <DraftingPoller />}
      <DetailHeader inquiry={inquiry} members={assigneeMembers} canReassign={canReassign} />
      <DraftReviewForm
        inquiry={inquiry}
        draft={draft}
        isEscalated={false}
        primaryDurationMin={primaryDurationMin}
        preDraft={
          <>
            {promotedCount !== null && <PromotedFlash count={promotedCount} />}
            <ConversationTimeline
              thread={thread}
              firmName={firm.name}
              currentInquiryId={inquiry.id}
            />
            <AiAnalysis inquiry={inquiry} />
            {aiReview && <AiReviewCard review={aiReview} />}
          </>
        }
        postDraft={null}
      />
    </section>
  );
}

function parsePromotedCount(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function lastSentAtFromThread(thread: { drafts: { metadata: unknown }[] }[]): Date | null {
  let latest: Date | null = null;
  for (const inq of thread) {
    for (const d of inq.drafts) {
      const m = d.metadata;
      if (!m || typeof m !== 'object' || Array.isArray(m)) continue;
      const at = (m as { sentAt?: unknown }).sentAt;
      if (typeof at !== 'string') continue;
      const t = new Date(at);
      if (Number.isNaN(t.getTime())) continue;
      if (!latest || t > latest) latest = t;
    }
  }
  return latest;
}

function PromotedFlash({ count }: { count: number }) {
  return (
    <div className="bg-accent-soft text-accent-ink rounded-md px-3.5 py-2.5 text-[12.5px]">
      送信元を顧問先として登録しました。同じアドレスからの未登録メール {count} 件を紐付け、AI
      が下書きを生成しています。
    </div>
  );
}
