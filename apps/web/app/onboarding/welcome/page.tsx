import { auth } from '@clerk/nextjs/server';
import { findFirmByClerkOrgId } from '@zeiro/db';
import { redirect } from 'next/navigation';
import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard';
import { PollForFirm } from '@/components/onboarding/poll-for-firm';

export const dynamic = 'force-dynamic';

export default async function WelcomePage() {
  const { orgId } = await auth();
  if (!orgId) redirect('/onboarding');

  const firm = await findFirmByClerkOrgId(orgId);
  if (!firm) {
    return (
      <main className="grid min-h-screen place-items-center bg-gradient-to-br from-bg via-bg to-accent-soft p-6">
        <div className="w-full max-w-[560px]">
          <Provisioning />
        </div>
      </main>
    );
  }

  // First-run only — once finished, /onboarding/welcome just bounces to the app.
  const settings = (firm.settings ?? {}) as Record<string, unknown>;
  if (settings.onboardingCompleted === true) redirect('/home');

  return (
    <main className="grid min-h-screen place-items-center bg-gradient-to-br from-bg via-bg to-accent-soft p-6">
      <OnboardingWizard
        firmName={firm.name}
        signature={typeof settings.signature === 'string' ? settings.signature : ''}
        inboundAddress={firm.inboundAddress}
      />
    </main>
  );
}

function Provisioning() {
  return (
    <div className="rounded-lg border border-line bg-surface p-9 shadow-md anim-stagger">
      <span className="grid h-10 w-10 place-items-center rounded-md bg-accent-soft">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </span>
      <PollForFirm />
      <h1 className="mt-4 font-sans text-[20px] font-semibold text-ink">事務所情報を準備中…</h1>
      <p className="mt-1.5 text-[13px] text-muted">組織情報を反映しています。数秒で完了します。</p>
    </div>
  );
}
