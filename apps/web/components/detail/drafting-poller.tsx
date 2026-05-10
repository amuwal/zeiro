'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

type Props = { intervalMs?: number };

export function DraftingPoller({ intervalMs = 2500 }: Props) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);
  return null;
}
