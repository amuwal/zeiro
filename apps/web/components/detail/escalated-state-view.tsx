import type { AiReview } from '@zeiro/core';
import type { ThreadInquiry } from '@zeiro/db';
import { rejectDraft } from '@/app/(app)/inbox/actions';
import { Icon } from '@/components/ui/icon';
import { AiReviewCard } from './ai-review-card';
import { ConversationTimeline } from './conversation-timeline';
import { EscalateBanner } from './escalate-banner';
import { FollowUpCompose } from './follow-up-compose';

type Props = {
  inquiryId: string;
  thread: ThreadInquiry[];
  firmName: string;
  aiReview: AiReview | null;
  fallbackReason: string | null;
  fallbackFailureType: string | null;
};

export function EscalatedStateView({
  inquiryId,
  thread,
  firmName,
  aiReview,
  fallbackReason,
  fallbackFailureType,
}: Props) {
  return (
    <>
      <div className="detail-body detail-anim">
        <ConversationTimeline thread={thread} firmName={firmName} currentInquiryId={inquiryId} />
        {aiReview ? (
          <AiReviewCard review={aiReview} />
        ) : (
          <EscalateBanner
            inquiryId={inquiryId}
            reason={fallbackReason}
            failureType={fallbackFailureType}
          />
        )}
        <FollowUpCompose inquiryId={inquiryId} variant="manual" />
      </div>
      <footer className="detail-actions">
        <div className="action-meta">
          <span className="item">
            <Icon name="shield" size={12} /> <b>テナント分離</b> 有効
          </span>
          <span className="item">
            <Icon name="doc" size={12} /> 監査ログ <b>記録中</b>
          </span>
        </div>
        <form className="btn-cluster">
          <input type="hidden" name="inquiryId" value={inquiryId} />
          <button type="submit" className="btn btn-ghost" formAction={rejectDraft}>
            <Icon name="x" size={13} /> 却下
          </button>
        </form>
      </footer>
    </>
  );
}
