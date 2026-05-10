import type { ThreadInquiry } from '@zeiro/db';
import Link from 'next/link';
import { StatusChip } from '@/components/ui/status-chip';
import { formatRelativeTime, makePreview } from '@/lib/format';

type Props = {
  thread: ThreadInquiry[];
  currentInquiryId: string;
};

export function ThreadHistory({ thread, currentInquiryId }: Props) {
  const others = thread.filter((i) => i.id !== currentInquiryId);
  if (others.length === 0) return null;

  return (
    <div className="section">
      <div className="section-head">
        <span>CONVERSATION HISTORY</span>
        <span className="badge">{others.length} 件</span>
      </div>
      <ol className="thread-list">
        {others.map((inq) => (
          <li key={inq.id}>
            <Link href={`/inbox/${inq.id}`} className="thread-row">
              <div className="thread-row-meta">
                <span className="thread-row-time">{formatRelativeTime(inq.receivedAt)}</span>
                <StatusChip status={inq.status} />
              </div>
              <div className="thread-row-subject">{inq.subject || '(件名なし)'}</div>
              <div className="thread-row-preview">{makePreview(inq.body, 100)}</div>
              {inq.drafts.length > 0 && (
                <div className="thread-row-reply">
                  ↳ 返信: {inq.drafts[0].subject || '(下書き)'}
                </div>
              )}
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
