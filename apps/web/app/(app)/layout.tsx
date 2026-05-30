import { countUnreadLeaves } from '@zeiro/db';
import type { ReactNode } from 'react';
import { Topbar } from '@/components/shell/topbar';
import { ctxCan, viewerScope } from '@/lib/authz';
import { requireFirmContext } from '@/lib/firm-context';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const ctx = await requireFirmContext();
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
