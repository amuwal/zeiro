import Link from 'next/link';
import { CopyButton } from '@/components/onboarding/copy-button';
import { Icon } from '@/components/ui/icon';

type Props = {
  inboundAddress: string;
  unmatchedCount: number;
};

const summaryStyle: React.CSSProperties = {
  cursor: 'pointer',
  color: 'var(--ink-2)',
  fontSize: 13,
  fontWeight: 500,
};
const stepsStyle: React.CSSProperties = {
  marginTop: 10,
  fontSize: 13,
  lineHeight: 1.85,
  color: 'var(--ink-2)',
  paddingLeft: '1.1rem',
};

export function EmailInboundSection({ inboundAddress, unmatchedCount }: Props) {
  return (
    <section className="kb-section">
      <header className="kb-section-head">
        <h2>メール受信</h2>
        <p>
          顧問先からのメールを自動で問い合わせとして取り込み、AI が下書きを生成します。
          おすすめは、事務所の既存アドレス (info@ など) からこの受信アドレスへ
          <strong>自動転送</strong>
          を設定する方法です。顧問先はこれまで通り事務所のアドレスに送るだけで、
          アドレス変更の案内は不要です。名刺やサインにこの受信アドレスを直接記載しても構いません。
        </p>
      </header>

      <div className="kb-inline-card">
        <div>
          <span className="kb-inline-label">受信アドレス</span>
          <code className="kb-inline-code">{inboundAddress}</code>
        </div>
        <CopyButton text={inboundAddress} />
      </div>

      <details>
        <summary style={summaryStyle}>メール転送の設定方法 (Gmail / Outlook)</summary>
        <div style={{ marginTop: 8 }}>
          <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 4px' }}>Gmail</p>
          <ol style={stepsStyle}>
            <li>設定 (⚙) →「メール転送と POP/IMAP」→「転送先アドレスを追加」</li>
            <li>上記の受信アドレスを入力して追加</li>
            <li>
              確認メールが Zeiro 側に届くため、受信トレイの「未登録 (新規)」に表示される確認コード /
              リンクで承認する
            </li>
            <li>「受信メールを … に転送する」を選択して保存 (フィルタで全件転送も可)</li>
          </ol>
          <p style={{ fontSize: 12, color: 'var(--muted)', margin: '8px 0 4px' }}>
            Outlook / Microsoft 365
          </p>
          <ol style={stepsStyle}>
            <li>設定 → メール → ルール →「新しいルールを追加」</li>
            <li>条件「すべてのメッセージに適用」</li>
            <li>アクション「転送先」に上記の受信アドレスを指定して保存</li>
          </ol>
        </div>
      </details>

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
