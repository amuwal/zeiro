import { getDraftByInquiry, getFirm, getInquiry, walkThread } from '@zeiro/db';
import { notFound } from 'next/navigation';
import { AiAnalysis } from '@/components/detail/ai-analysis';
import { CitationList } from '@/components/detail/citation-list';
import { DetailHeader } from '@/components/detail/detail-header';
import { DraftReviewForm } from '@/components/detail/draft-review-form';
import { EscalateBanner } from '@/components/detail/escalate-banner';
import { OriginalMessage } from '@/components/detail/original-message';
import { ThreadHistory } from '@/components/detail/thread-history';
import { requireFirmContext } from '@/lib/firm-context';
import { readReason } from '@/lib/inquiry-derived';

type Params = { inquiryId: string };

export default async function InquiryDetailPage({ params }: { params: Promise<Params> }) {
  const { inquiryId } = await params;
  const { firmId } = await requireFirmContext();

  const [inquiry, draft, firm, thread] = await Promise.all([
    getInquiry(firmId, inquiryId),
    getDraftByInquiry(inquiryId),
    getFirm(firmId),
    walkThread(firmId, inquiryId),
  ]);

  if (!inquiry) notFound();

  const isEscalated = inquiry.status === 'escalated';
  const primaryDurationMin = draft
    ? (draft.createdAt.getTime() - inquiry.receivedAt.getTime()) / 60_000
    : null;

  return (
    <section className="detail-col" key={inquiry.id}>
      <DetailHeader inquiry={inquiry} />
      <DraftReviewForm
        inquiry={inquiry}
        draft={draft}
        isEscalated={isEscalated}
        primaryDurationMin={primaryDurationMin}
        preDraft={
          <>
            {thread.length > 0 && <ThreadHistory thread={thread} currentInquiryId={inquiry.id} />}
            <OriginalMessage inquiry={inquiry} firmInbound={firm.inboundAddress} />
            <AiAnalysis inquiry={inquiry} />
            {isEscalated && <EscalateBanner inquiryId={inquiry.id} reason={readReason(inquiry)} />}
          </>
        }
        postDraft={draft && <CitationList citations={draft.citations} />}
      />
    </section>
  );
}
