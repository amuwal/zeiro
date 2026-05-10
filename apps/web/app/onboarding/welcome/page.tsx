import { auth } from '@clerk/nextjs/server';
import { findFirmByClerkOrgId } from '@zeiro/db';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CopyButton } from '@/components/onboarding/copy-button';
import { PollForFirm } from '@/components/onboarding/poll-for-firm';

export const dynamic = 'force-dynamic';

export default async function WelcomePage() {
  const { orgId } = await auth();
  if (!orgId) redirect('/onboarding');

  const firm = await findFirmByClerkOrgId(orgId);

  return (
    <main
      style={{
        display: 'grid',
        placeItems: 'center',
        minHeight: '100vh',
        padding: '2rem',
        background: 'var(--bg)',
      }}
    >
      <div
        style={{
          maxWidth: 540,
          width: '100%',
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 14,
          padding: '2.25rem',
          boxShadow: 'var(--shadow)',
        }}
      >
        {firm ? <Provisioned firm={firm} /> : <Provisioning />}
      </div>
    </main>
  );
}

function Provisioning() {
  return (
    <>
      <PollForFirm />
      <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: 22, fontWeight: 600, margin: 0 }}>
        事務所情報を準備中…
      </h1>
      <p style={{ color: 'var(--muted)', marginTop: 8 }}>
        Clerk からの組織情報を反映しています。数秒で完了します。
      </p>
    </>
  );
}

function Provisioned({ firm }: { firm: { name: string; inboundAddress: string } }) {
  return (
    <>
      <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: 22, fontWeight: 600, margin: 0 }}>
        {firm.name} の準備が完了しました
      </h1>
      <p style={{ color: 'var(--muted)', marginTop: 8 }}>
        顧問先からの問い合わせを以下の専用アドレスに転送してください。
      </p>

      <div
        style={{
          marginTop: 20,
          padding: '14px 16px',
          background: 'var(--surface-2)',
          border: '1px solid var(--line)',
          borderRadius: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          justifyContent: 'space-between',
        }}
      >
        <code style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{firm.inboundAddress}</code>
        <CopyButton text={firm.inboundAddress} />
      </div>

      <ol style={{ marginTop: 20, color: 'var(--ink-2)', fontSize: 13, lineHeight: 1.8 }}>
        <li>顧問先に「お問い合わせはこのアドレスへ」と案内する</li>
        <li>受信したメールは数秒以内に Zeiro に取り込まれ、AI が下書きを作成する</li>
        <li>受信トレイで下書きをレビュー → そのまま送信または編集して送信</li>
      </ol>

      <div style={{ marginTop: 24 }}>
        <Link href="/inbox" className="btn btn-primary">
          受信トレイへ
        </Link>
      </div>
    </>
  );
}
