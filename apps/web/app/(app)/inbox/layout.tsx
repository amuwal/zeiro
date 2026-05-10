import { getInboxCounts, getMyInquiryCount, getUser, listInquiries } from '@zeiro/db';
import type { ReactNode } from 'react';
import { InboxSidebar } from '@/components/inbox/inbox-sidebar';
import { InquiryList } from '@/components/inbox/inquiry-list';
import { requireFirmContext } from '@/lib/firm-context';

export default async function InboxLayout({ children }: { children: ReactNode }) {
  const { firmId, userId } = await requireFirmContext();
  const [inquiries, counts, me, myCount] = await Promise.all([
    listInquiries(firmId),
    getInboxCounts(firmId),
    getUser(userId),
    getMyInquiryCount(firmId, userId),
  ]);
  return (
    <div className="workspace">
      <InboxSidebar counts={counts} currentUser={{ id: me.id, name: me.name }} myCount={myCount} />
      <InquiryList items={inquiries} currentUserId={userId} />
      {children}
    </div>
  );
}
