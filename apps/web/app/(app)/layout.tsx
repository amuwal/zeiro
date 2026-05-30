import { getInboxCounts } from '@zeiro/db';
import type { ReactNode } from 'react';
import { Topbar } from '@/components/shell/topbar';
import { ctxCan, viewerScope } from '@/lib/authz';
import { requireFirmContext } from '@/lib/firm-context';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const ctx = await requireFirmContext();
  const counts = await getInboxCounts(ctx.firmId, viewerScope(ctx));
  const inboxCount = counts.pending + counts.drafted;
  return (
    <div className="app">
      <Topbar
        inboxCount={inboxCount}
        role={ctx.role}
        canViewAudit={ctxCan(ctx, 'audit.view')}
        canViewAnalytics={ctxCan(ctx, 'analytics.viewFirm')}
      />
      {children}
    </div>
  );
}
