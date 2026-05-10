import { getInboxCounts } from '@zeiro/db';
import type { ReactNode } from 'react';
import { Topbar } from '@/components/shell/topbar';
import { requireFirmContext } from '@/lib/firm-context';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const { firmId, role } = await requireFirmContext();
  const counts = await getInboxCounts(firmId);
  const inboxCount = counts.pending + counts.drafted;
  const admin = role.toLowerCase().includes('admin');
  return (
    <div className="app">
      <Topbar inboxCount={inboxCount} admin={admin} />
      {children}
    </div>
  );
}
