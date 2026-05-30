'use client';

import { useEffect } from 'react';
import { markInquiryReadAction } from '@/app/(app)/inbox/actions';

// Marks the inquiry seen for the current user when its detail view opens —
// clears it from the unread list, the inbox badge, and notifications.
export function MarkRead({ inquiryId }: { inquiryId: string }) {
  useEffect(() => {
    markInquiryReadAction(inquiryId).catch(() => {});
  }, [inquiryId]);
  return null;
}
