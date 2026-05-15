'use client';

import { useClerk, useUser } from '@clerk/nextjs';
import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { makeInitials } from '@/lib/format';

export function UserMenu() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const displayName = user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? '';
  const email = user?.primaryEmailAddress?.emailAddress ?? '';
  const initials = makeInitials(displayName || email || '?');

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        className="avatar"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="アカウントメニュー"
        onClick={() => setOpen((o) => !o)}
      >
        {isLoaded ? initials : ''}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-50 min-w-[220px] rounded-md border border-line bg-surface shadow-md"
        >
          <div className="border-b border-line px-3 py-2.5">
            <div className="text-[13px] font-medium text-ink truncate">{displayName || '—'}</div>
            {email && email !== displayName && (
              <div className="font-mono text-[11px] text-muted truncate mt-0.5">{email}</div>
            )}
          </div>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[12.5px] text-ink-2 hover:bg-surface-2 transition-colors"
            onClick={() => {
              setOpen(false);
              signOut({ redirectUrl: '/sign-in' });
            }}
          >
            <Icon name="arrow-right" size={13} />
            サインアウト
          </button>
        </div>
      )}
    </div>
  );
}
