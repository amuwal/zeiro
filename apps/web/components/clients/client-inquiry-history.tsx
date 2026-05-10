import type { ClientInquirySummary } from '@zeiro/db';
import Link from 'next/link';
import { StatusChip } from '@/components/ui/status-chip';

const CHANNEL_LABELS: Record<string, string> = {
  email: 'メール',
  line: 'LINE',
  web: 'Web',
};

export function ClientInquiryHistory({ inquiries }: { inquiries: ClientInquirySummary[] }) {
  return (
    <section className="cl-section">
      <div className="cl-section-title">問い合わせ履歴 ({inquiries.length}件)</div>
      <div className="cl-history">
        {inquiries.length === 0 ? (
          <div className="cl-history-empty">この顧問先からの問い合わせはまだありません</div>
        ) : (
          inquiries.map((inq) => (
            <Link
              key={inq.id}
              href={`/inbox/${inq.id}`}
              className="cl-history-row"
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <span className="when">
                {inq.receivedAt.toLocaleDateString('ja-JP')}
                {' · '}
                {CHANNEL_LABELS[inq.channel] ?? inq.channel}
              </span>
              <span className="subject">{inq.subject || '(件名なし)'}</span>
              <span className="status">
                <StatusChip status={inq.status} />
              </span>
            </Link>
          ))
        )}
      </div>
    </section>
  );
}
