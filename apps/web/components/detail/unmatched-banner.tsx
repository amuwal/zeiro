import Link from 'next/link';
import { rejectUnmatchedAction } from '@/app/(app)/inbox/unmatched-actions';
import { Icon } from '@/components/ui/icon';

type Props = {
  inquiryId: string;
  fromAddress: string;
  fromName: string | null;
  subject: string;
};

export function UnmatchedBanner({ inquiryId, fromAddress, fromName, subject }: Props) {
  const displayName = fromName ?? inferNameFromEmail(fromAddress);
  const promoteHref = `/clients/new?email=${encodeURIComponent(fromAddress)}&name=${encodeURIComponent(displayName)}&from=email&inquiry=${inquiryId}`;
  return (
    <div className="unmatched-banner">
      <div className="unmatched-banner-icon">
        <Icon name="alert" size={16} />
      </div>
      <div className="unmatched-banner-body">
        <strong>未登録の送信元から届いたメールです</strong>
        <p>
          <code>{fromAddress}</code> はこの事務所の顧問先として登録されていません。
          顧問先として登録すると AI が自動で下書きを生成します。
          関係のないメールであれば削除してください。
        </p>
      </div>
      <div className="unmatched-banner-actions">
        <Link href={promoteHref} className="btn btn-primary">
          <Icon name="user" size={13} /> 顧問先として登録
        </Link>
        <form action={rejectUnmatchedAction}>
          <input type="hidden" name="inquiryId" value={inquiryId} />
          <input type="hidden" name="fromAddress" value={fromAddress} />
          <input type="hidden" name="subject" value={subject} />
          <button type="submit" className="btn btn-secondary">
            削除
          </button>
        </form>
      </div>
    </div>
  );
}

function inferNameFromEmail(email: string): string {
  const local = email.split('@')[0] ?? '';
  return local.replace(/[._-]+/g, ' ').trim();
}
