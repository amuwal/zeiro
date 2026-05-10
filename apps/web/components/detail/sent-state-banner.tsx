import { Icon } from '@/components/ui/icon';
import { formatRelativeTime } from '@/lib/format';

export function SentStateBanner({ sentAt }: { sentAt: Date | null }) {
  return (
    <div className="sent-banner">
      <span className="sent-icon">
        <Icon name="check" size={14} />
      </span>
      <div className="sent-text">
        <strong>送信済</strong>
        <span>
          {sentAt ? `${formatRelativeTime(sentAt)} に返信を送信しました — ` : ''}
          お客様の返信をお待ちしています
        </span>
      </div>
    </div>
  );
}
