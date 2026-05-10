import Link from 'next/link';
import { CopyButton } from '@/components/onboarding/copy-button';
import { Icon } from '@/components/ui/icon';

type Props = {
  inboundAddress: string;
  unmatchedCount: number;
};

export function EmailInboundSection({ inboundAddress, unmatchedCount }: Props) {
  return (
    <section className="kb-section">
      <header className="kb-section-head">
        <h2>メール受信</h2>
        <p>
          顧問先からのメールを自動で問い合わせとして取り込み、AI が下書きを生成します。
          このアドレスを名刺・契約書・サインなどでお客様に共有してください。
        </p>
      </header>

      <div className="kb-inline-card">
        <div>
          <span className="kb-inline-label">受信アドレス</span>
          <code className="kb-inline-code">{inboundAddress}</code>
        </div>
        <CopyButton text={inboundAddress} />
      </div>

      <div className="kb-inline-info">
        <span className="kb-inline-info-icon">
          <Icon name="user" size={14} />
        </span>
        <div>
          <strong>顧問先として登録されたアドレスからのメールのみ自動下書きされます。</strong>
          <p>
            未登録のアドレスから届いたメールは「未登録
            (新規)」フォルダに振り分けられ、レビュー後に顧問先として登録するか削除できます。
            {unmatchedCount > 0 && (
              <>
                {' '}
                現在 <strong>{unmatchedCount}件</strong> のレビュー待ちがあります。
              </>
            )}
          </p>
          <div className="kb-inline-info-actions">
            <Link href="/clients" className="btn btn-secondary">
              顧問先を管理
            </Link>
            {unmatchedCount > 0 && (
              <Link href="/inbox?filter=unmatched" className="btn btn-secondary">
                未登録メールをレビュー ({unmatchedCount})
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
