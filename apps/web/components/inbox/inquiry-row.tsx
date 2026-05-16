import type { InquiryThreadRow as InquiryRowData } from '@zeiro/db';
import Link from 'next/link';
import { CategoryPill, CategoryStripe } from '@/components/ui/category-pill';
import { ConfidenceDots } from '@/components/ui/confidence-dots';
import { Icon } from '@/components/ui/icon';
import { StatusChip } from '@/components/ui/status-chip';
import { UrgentTag } from '@/components/ui/urgent-tag';
import { formatRelativeTime, makePreview } from '@/lib/format';
import { readCategory, readConfidence, readUrgent } from '@/lib/inquiry-derived';

type Props = {
  inquiry: InquiryRowData;
  selected: boolean;
  query?: string;
};

export function InquiryRow({ inquiry, selected, query }: Props) {
  const unread = inquiry.status === 'pending';
  const urgent = readUrgent(inquiry);
  const confidence = readConfidence(inquiry);
  const category = readCategory(inquiry);

  const classes = ['inbox-item', selected && 'selected', unread && 'unread', urgent && 'urgent']
    .filter(Boolean)
    .join(' ');
  const href = query ? `/inbox/${inquiry.id}?${query}` : `/inbox/${inquiry.id}`;

  return (
    <Link href={href} className={classes}>
      <CategoryStripe category={category} />
      <div className="item-body">
        <div className="item-row1">
          <span className="company">
            {inquiry.client?.name ?? `(未登録) ${inquiry.unmatchedSender ?? '不明な送信元'}`}
          </span>
          {urgent && <UrgentTag />}
          <span className="time">{formatRelativeTime(inquiry.receivedAt)}</span>
        </div>
        <div className="item-subject">{stripRePrefix(inquiry.subject)}</div>
        <div className="item-preview">{makePreview(inquiry.body)}</div>
        <div className="item-row3">
          <CategoryPill category={category} />
          {confidence !== null && <ConfidenceDots score={confidence} />}
          <StatusChip status={inquiry.status} />
          <AssigneeChip name={inquiry.assignedTo?.name ?? null} />
          {inquiry.threadCount > 1 && (
            <span className="thread-count">
              <Icon name="inbox" size={11} />
              {inquiry.threadCount} 件
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function AssigneeChip({ name }: { name: string | null }) {
  if (name) {
    return (
      <span className="assignee-chip">
        <Icon name="user" size={10} />
        {name}
      </span>
    );
  }
  return (
    <span className="assignee-chip is-unassigned">
      <Icon name="user" size={10} />
      未割り当て
    </span>
  );
}

function stripRePrefix(subject: string): string {
  const trimmed = (subject || '').trim();
  if (!trimmed) return '(件名なし)';
  return trimmed.replace(/^(?:Re:\s*)+/i, '').trim() || trimmed;
}
