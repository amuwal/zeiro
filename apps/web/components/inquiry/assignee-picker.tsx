'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import {
  listFirmAssigneesAction,
  reassignInquiryAction,
} from '@/app/(app)/inbox/actions';
import { Icon } from '@/components/ui/icon';

type Assignee = { id: string; name: string; tier: string };

type Props = {
  inquiryId: string;
  currentAssigneeId: string | null;
  currentAssigneeName: string | null;
};

/** Dropdown in the thread head that lets the user reassign the inquiry. Loads
 * the firm member list lazily on first open to avoid burning a DB query on
 * every inquiry render. */
export function AssigneePicker({ inquiryId, currentAssigneeId, currentAssigneeName }: Props) {
  const [open, setOpen] = useState(false);
  const [assignees, setAssignees] = useState<Assignee[] | null>(null);
  const [busy, startTransition] = useTransition();
  const wrapRef = useRef<HTMLDivElement>(null);

  // Lazy-load on first open
  useEffect(() => {
    if (!open || assignees !== null) return;
    listFirmAssigneesAction()
      .then(setAssignees)
      .catch(() => setAssignees([]));
  }, [open, assignees]);

  // Close on outside click / Esc
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const pick = (assigneeId: string | null) => {
    setOpen(false);
    startTransition(() => {
      reassignInquiryAction(inquiryId, assigneeId).catch(() => {
        // No-op — the server action already audited; UI will eventually
        // re-fetch via revalidatePath.
      });
    });
  };

  const label = currentAssigneeName ?? '未割当';

  return (
    <div ref={wrapRef} className="assignee-picker">
      <button
        type="button"
        className="assignee-picker-trigger"
        onClick={() => setOpen((v) => !v)}
        disabled={busy}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Icon name="user" size={11} />
        <span>{busy ? '更新中…' : label}</span>
        <Icon name="chevron-down" size={10} />
      </button>
      {open && (
        <div role="menu" className="assignee-picker-menu">
          <button
            type="button"
            role="menuitem"
            className={`assignee-picker-item ${currentAssigneeId === null ? 'active' : ''}`}
            onClick={() => pick(null)}
          >
            <Icon name="x" size={11} /> 未割当
          </button>
          {assignees === null && <div className="assignee-picker-loading">読み込み中…</div>}
          {assignees?.map((a) => (
            <button
              key={a.id}
              type="button"
              role="menuitem"
              className={`assignee-picker-item ${currentAssigneeId === a.id ? 'active' : ''}`}
              onClick={() => pick(a.id)}
            >
              <Icon name="user" size={11} />
              <span>{a.name}</span>
              {a.tier === 'admin' && <span className="tier-tag">所長</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
