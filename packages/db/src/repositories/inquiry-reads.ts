import { getPrisma } from '../server';

// Mark a leaf inquiry as seen by a user (idempotent; refreshes read_at).
export async function markInquiryRead(
  firmId: string,
  userId: string,
  inquiryId: string,
): Promise<void> {
  await getPrisma().inquiryRead.upsert({
    where: { inquiryId_userId: { inquiryId, userId } },
    update: { readAt: new Date() },
    create: { firmId, inquiryId, userId },
  });
}

// The set of inquiry IDs this user has already opened — used to flag unread
// rows in the inbox list.
export async function listReadInquiryIds(firmId: string, userId: string): Promise<Set<string>> {
  const rows = await getPrisma().inquiryRead.findMany({
    where: { firmId, userId },
    select: { inquiryId: true },
  });
  return new Set(rows.map((r) => r.inquiryId));
}
