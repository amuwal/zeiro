import { countUnreadLeaves } from '@zeiro/db';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { Topbar } from '@/components/shell/topbar';
import { ctxCan, viewerScope } from '@/lib/authz';
import { requireFirmContext } from '@/lib/firm-context';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const ctx = await requireFirmContext();
  // First-run gate: a freshly-provisioned firm (e.g. org created via Clerk's
  // hosted portal) must finish the onboarding wizard before using the app. The
  // wizard lives outside this (app) route group, so this won't loop.
  if (!ctx.onboardingCompleted) redirect('/onboarding/welcome');
  // WhatsApp-style: the inbox badge + bell dot count UNREAD items (not yet
  // opened by this user); opening an inquiry clears it.
  const unread = await countUnreadLeaves(ctx.firmId, ctx.userId, viewerScope(ctx));
  const inboxCount = unread;
  const attentionCount = unread;
  return (
    <div className="app">
      <Topbar
        inboxCount={inboxCount}
        attentionCount={attentionCount}
        role={ctx.role}
        canViewAudit={ctxCan(ctx, 'audit.view')}
        canViewAnalytics={ctxCan(ctx, 'analytics.viewFirm')}
      />
      {children}
    </div>
  );
}
