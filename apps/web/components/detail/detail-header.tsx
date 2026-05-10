import type { InquiryWithClient } from '@zeiro/db';
import { Avatar } from '@/components/ui/avatar';
import { CategoryTag } from '@/components/ui/category-pill';
import { Icon } from '@/components/ui/icon';
import { formatFullJST } from '@/lib/format';
import { readCategory } from '@/lib/inquiry-derived';

export function DetailHeader({ inquiry }: { inquiry: InquiryWithClient }) {
  const category = readCategory(inquiry);
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
      <div className="detail-subject">{inquiry.subject || '(件名なし)'}</div>
      <div className="detail-meta-row">
        <div className="detail-from">
          <Avatar name={inquiry.client.name} />
          <div>
            <span className="who">{inquiry.client.name}</span>
            <span className="meta-sep">·</span>
            <span className="role">{inquiry.client.primaryEmail}</span>
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
