import { CreateOrganization, OrganizationList } from '@clerk/nextjs';

export default function OnboardingPage() {
  return (
    <main style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', padding: '2rem', background: 'var(--bg)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', alignItems: 'center' }}>
        <header style={{ textAlign: 'center', maxWidth: 480 }}>
          <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: 22, fontWeight: 600, margin: 0 }}>
            事務所を選択または作成
          </h1>
          <p style={{ color: 'var(--muted)', marginTop: 8 }}>
            既存の事務所に招待されている場合は下から選択してください。新しく作る場合は「新規作成」へ。
          </p>
        </header>
        <OrganizationList hidePersonal afterSelectOrganizationUrl="/onboarding/welcome" afterCreateOrganizationUrl="/onboarding/welcome" />
        <details>
          <summary style={{ cursor: 'pointer', color: 'var(--muted)' }}>新規事務所を作成</summary>
          <div style={{ marginTop: '1rem' }}>
            <CreateOrganization afterCreateOrganizationUrl="/onboarding/welcome" skipInvitationScreen />
          </div>
        </details>
      </div>
    </main>
  );
}
