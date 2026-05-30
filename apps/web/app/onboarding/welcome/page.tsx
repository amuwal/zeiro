import { auth } from '@clerk/nextjs/server';
import { findFirmByClerkOrgId } from '@zeiro/db';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CopyButton } from '@/components/onboarding/copy-button';
import { PollForFirm } from '@/components/onboarding/poll-for-firm';
import { SetupChecklist } from '@/components/onboarding/setup-checklist';
import { Icon } from '@/components/ui/icon';

export const dynamic = 'force-dynamic';

export default async function WelcomePage() {
  const { orgId } = await auth();
  if (!orgId) redirect('/onboarding');

  const firm = await findFirmByClerkOrgId(orgId);

  return (
    <main className="grid min-h-screen place-items-center bg-bg p-8">
      <div className="w-full max-w-[600px]">
        {firm ? <Provisioned firm={firm} /> : <Provisioning />}
      </div>
    </main>
  );
}

function Provisioning() {
  return (
    <div className="rounded-lg border border-line bg-surface p-9 shadow-md">
      <PollForFirm />
      <h1 className="font-sans text-[22px] font-semibold text-ink">事務所情報を準備中…</h1>
      <p className="mt-2 text-[13px] text-muted">
        Clerk からの組織情報を反映しています。数秒で完了します。
      </p>
    </div>
  );
}

function Provisioned({ firm }: { firm: { name: string; inboundAddress: string } }) {
  return (
    <div className="flex flex-col gap-5">
      <header className="rounded-lg border border-line bg-surface p-9 shadow-md">
        <span className="grid h-11 w-11 place-items-center rounded-md bg-accent-soft text-accent">
          <Icon name="spark" size={22} />
        </span>
        <h1 className="mt-4 font-sans text-[22px] font-semibold text-ink">
          {firm.name} の準備が完了しました
        </h1>
        <p className="mt-2 text-[13px] text-muted">
          顧問先からの問い合わせを以下の専用アドレスに転送してください。AI
          が下書きを作成し、受信トレイでレビューできます。
        </p>

        <div className="mt-5 flex items-center justify-between gap-3 rounded-md border border-line bg-bg-2 px-4 py-3">
          <code className="truncate font-mono text-[13px] text-ink-2">{firm.inboundAddress}</code>
          <CopyButton text={firm.inboundAddress} />
        </div>

        <div className="mt-6">
          <Link href="/home" className="btn btn-primary">
            セットアップを続ける
            <Icon name="arrow-right" size={13} />
          </Link>
        </div>
      </header>

      <SetupChecklist />
    </div>
  );
}
