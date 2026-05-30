'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// While an inquiry is still being processed (pending), soft-refresh the server
// component every few seconds so the draft / status appears the moment the
// pipeline finishes — no manual reload. Self-stops once the status leaves
// 'pending' (the effect re-runs with the new status and skips), and caps total
// polling so a genuinely stuck inquiry doesn't refresh forever.
const INTERVAL_MS = 3000;
const MAX_TICKS = 40; // ~2 min ceiling

export function DraftPoller({ inquiryId, status }: { inquiryId: string; status: string }) {
  const router = useRouter();
  useEffect(() => {
    if (status !== 'pending') return;
    let ticks = 0;
    const timer = setInterval(() => {
      ticks += 1;
      router.refresh();
      if (ticks >= MAX_TICKS) clearInterval(timer);
    }, INTERVAL_MS);
    return () => clearInterval(timer);
  }, [inquiryId, status, router]);
  return null;
}
