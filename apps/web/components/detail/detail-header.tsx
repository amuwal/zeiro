import type { InquiryWithClient } from '@zeiro/db';
import { Avatar } from '@/components/ui/avatar';
import { CategoryTag } from '@/components/ui/category-pill';
import { Icon } from '@/components/ui/icon';
import { formatFullJST } from '@/lib/format';
import { readCategory, readSenderName } from '@/lib/inquiry-derived';

export function DetailHeader({ inquiry }: { inquiry: InquiryWithClient }) {
  const category = readCategory(inquiry);
  const senderName = inquiry.client?.name ?? readSenderName(inquiry) ?? '(未登録の送信者)';
  const senderEmail = inquiry.client?.primaryEmail ?? inquiry.unmatchedSender ?? '不明';
  return (
    <header className="detail-head detail-anim">
      <div className="detail-toprow">
        <div className="crumbs">
          <span>受信トレイ</span>
          <span className="sep">/</span>
          <span style={{ color: 'var(--ink-2)', fontWeight: 500 }}>{category}</span>
        </div>
        <span className="id">{shortId(inquiry.id)}</span>
        <div className="actions">
          <button type="button" className="icon-btn" aria-label="アーカイブ">
            <Icon name="archive" size={14} />
          </button>
          <button type="button" className="icon-btn" aria-label="その他">
            <Icon name="more" size={14} />
          </button>
        </div>
      </div>
      <div className="detail-subject">{normaliseSubject(inquiry.subject)}</div>
      <div className="detail-meta-row">
        <div className="detail-from">
          <Avatar name={senderName} />
          <div>
            <span className="who">{senderName}</span>
            <span className="meta-sep">·</span>
            <span className="role">{senderEmail}</span>
          </div>
        </div>
        <CategoryTag category={category} />
        <span className="detail-tag mono">
          <Icon name="clock" size={11} /> {formatFullJST(inquiry.receivedAt)}
        </span>
      </div>
    </header>
  );
}

function shortId(id: string): string {
  return `INQ-${id.slice(0, 8)}`;
}

function normaliseSubject(raw: string): string {
  const trimmed = (raw || '').trim();
  if (!trimmed) return '(件名なし)';
  return trimmed.replace(/^(?:Re:\s*)+/i, '').trim() || trimmed;
}
