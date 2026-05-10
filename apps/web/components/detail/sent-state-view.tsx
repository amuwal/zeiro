import type { ThreadInquiry } from '@zeiro/db';
import { ConversationTimeline } from './conversation-timeline';
import { FollowUpCompose } from './follow-up-compose';
import { SentStateBanner } from './sent-state-banner';

type Props = {
  inquiryId: string;
  thread: ThreadInquiry[];
  firmName: string;
  lastSentAt: Date | null;
};

export function SentStateView({ inquiryId, thread, firmName, lastSentAt }: Props) {
  return (
    <div className="detail-body detail-anim">
      <ConversationTimeline thread={thread} firmName={firmName} currentInquiryId={inquiryId} />
      <SentStateBanner sentAt={lastSentAt} />
      <FollowUpCompose inquiryId={inquiryId} />
    </div>
  );
}
