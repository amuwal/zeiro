'use client';

import type { InquiryWithClient } from '@zeiro/db';
import { useEffect, useRef, useState } from 'react';
import { reassignInquiry } from '@/app/(app)/inbox/actions';
import { Icon } from '@/components/ui/icon';

type Member = { id: string; name: string; tier: string };

type Props = {
  inquiry: InquiryWithClient;
  members: Member[];
  // Whether the current viewer is allowed to reassign. False for non-admins
  // who aren't the current assignee; the badge still renders, just no menu.
  editable: boolean;
};

export function AssigneeControl({ inquiry, members, editable }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click — small dropdown, no headless-ui dependency.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const currentName = inquiry.assignedTo?.name ?? null;
  const currentTier = members.find((m) => m.id === inquiry.assignedToId)?.tier ?? null;

  return (
    <div ref={ref} className="assignee-control">
      <button
        type="button"
        className={`assignee-pill${currentName ? '' : ' is-unassigned'}${editable ? ' is-editable' : ''}`}
        onClick={() => editable && setOpen((v) => !v)}
        aria-haspopup={editable ? 'menu' : undefined}
        aria-expanded={editable ? open : undefined}
        disabled={!editable}
      >
        <Icon name="user" size={11} />
        <span>
          {currentName ? (
            <>
              担当 <b>{currentName}</b>
              {currentTier && <TierBadge tier={currentTier} />}
            </>
          ) : (
            <>未割り当て</>
          )}
        </span>
        {editable && <Icon name="chevron-down" size={11} />}
      </button>

      {editable && open && (
        <div className="assignee-menu" role="menu">
          <form action={reassignInquiry} className="assignee-menu-row">
            <input type="hidden" name="inquiryId" value={inquiry.id} />
            <input type="hidden" name="assigneeUserId" value="" />
            <button type="submit" className="assignee-menu-btn is-unassign" role="menuitem">
              <Icon name="x" size={11} /> 未割り当てにする
            </button>
          </form>
          <div className="assignee-menu-sep" />
          {members.map((m) => (
            <form key={m.id} action={reassignInquiry} className="assignee-menu-row">
              <input type="hidden" name="inquiryId" value={inquiry.id} />
              <input type="hidden" name="assigneeUserId" value={m.id} />
              <button
                type="submit"
                className={`assignee-menu-btn${m.id === inquiry.assignedToId ? ' is-current' : ''}`}
                role="menuitem"
              >
                <span>{m.name}</span>
                <TierBadge tier={m.tier} />
              </button>
            </form>
          ))}
        </div>
      )}
    </div>
  );
}

function TierBadge({ tier }: { tier: string }) {
  const label = tier === 'admin' ? '所長' : tier === 'senior' ? '上席' : '担当';
  return <span className={`tier-mini tier-${tier}`}>{label}</span>;
}
