import type { InquiryRow as InquiryRowData } from '@zeiro/db';
import Link from 'next/link';
import { CategoryPill, CategoryStripe } from '@/components/ui/category-pill';
import { ConfidenceDots } from '@/components/ui/confidence-dots';
import { StatusChip } from '@/components/ui/status-chip';
import { UrgentTag } from '@/components/ui/urgent-tag';
import { formatRelativeTime, makePreview } from '@/lib/format';
import { readCategory, readConfidence, readUrgent } from '@/lib/inquiry-derived';

type Props = {
  inquiry: InquiryRowData;
  selected: boolean;
};

export function InquiryRow({ inquiry, selected }: Props) {
  const unread = inquiry.status === 'pending';
  const urgent = readUrgent(inquiry);
  const confidence = readConfidence(inquiry);
  const category = readCategory(inquiry);

  const classes = ['inbox-item', selected && 'selected', unread && 'unread', urgent && 'urgent']
    .filter(Boolean)
    .join(' ');

  return (
    <Link href={`/inbox/${inquiry.id}`} className={classes}>
      <CategoryStripe category={category} />
      <div className="item-body">
        <div className="item-row1">
          <span className="company">{inquiry.client.name}</span>
          {urgent && <UrgentTag />}
          <span className="time">{formatRelativeTime(inquiry.receivedAt)}</span>
        </div>
        <div className="item-subject">{inquiry.subject || '(件名なし)'}</div>
        <div className="item-preview">{makePreview(inquiry.body)}</div>
        <div className="item-row3">
          <CategoryPill category={category} />
          {confidence !== null && <ConfidenceDots score={confidence} />}
          <StatusChip status={inquiry.status} />
        </div>
      </div>
    </Link>
  );
}
