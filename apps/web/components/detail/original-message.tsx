import type { InquiryWithClient } from '@zeiro/db';
import { formatFullJST } from '@/lib/format';
import { readSenderName } from '@/lib/inquiry-derived';

export function OriginalMessage({
  inquiry,
  firmInbound,
}: {
  inquiry: InquiryWithClient;
  firmInbound: string;
}) {
  const fromEmail = inquiry.client?.primaryEmail ?? inquiry.unmatchedSender ?? '不明';
  const fromName = inquiry.client?.name ?? readSenderName(inquiry) ?? '(未登録)';
  return (
    <div className="section">
      <div className="section-head">
        <span>ORIGINAL MESSAGE</span>
        <span className="badge">FROM {fromEmail}</span>
      </div>
      <div className="orig-card">
        <div className="orig-meta">
          <span>
            <b>From</b>
            {fromName} &lt;{fromEmail}&gt;
          </span>
          <span>
            <b>To</b>
            {firmInbound}
          </span>
          <span>
            <b>Received</b>
            {formatFullJST(inquiry.receivedAt)}
          </span>
        </div>
        <div className="orig-body">{inquiry.body}</div>
      </div>
    </div>
  );
}
