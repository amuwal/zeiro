import type { InquiryWithClient } from '@zeiro/db';
import { formatFullJST } from '@/lib/format';

export function OriginalMessage({
  inquiry,
  firmInbound,
}: {
  inquiry: InquiryWithClient;
  firmInbound: string;
}) {
  return (
    <div className="section">
      <div className="section-head">
        <span>ORIGINAL MESSAGE</span>
        <span className="badge">FROM {inquiry.client.primaryEmail}</span>
      </div>
      <div className="orig-card">
        <div className="orig-meta">
          <span>
            <b>From</b>
            {inquiry.client.name} &lt;{inquiry.client.primaryEmail}&gt;
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
