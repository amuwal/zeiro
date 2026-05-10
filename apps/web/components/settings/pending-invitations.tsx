'use client';

import { useActionState } from 'react';
import { revokeInvitation } from '@/app/(app)/settings/team-actions';
import { initialTeamState } from '@/app/(app)/settings/team-state';
import type { PendingInvitation } from '@/lib/team';
import { roleLabel } from '@/lib/team';

export function PendingInvitations({ invitations }: { invitations: PendingInvitation[] }) {
  if (invitations.length === 0) return null;
  return (
    <div className="member-table">
      <div className="member-row head">
        <div>メールアドレス</div>
        <div>役割</div>
        <div>送信日</div>
        <div>操作</div>
      </div>
      {invitations.map((inv) => (
        <PendingRow key={inv.id} invitation={inv} />
      ))}
    </div>
  );
}

function PendingRow({ invitation }: { invitation: PendingInvitation }) {
  const [state, action, pending] = useActionState(revokeInvitation, initialTeamState);

  return (
    <div className="member-row pending">
      <div className="member-mono">{invitation.emailAddress}</div>
      <div>{roleLabel(invitation.role)}</div>
      <div className="member-mono">
        {invitation.createdAt.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
      </div>
      <div>
        <form action={action}>
          <input type="hidden" name="invitationId" value={invitation.id} />
          <button
            type="submit"
            className="btn btn-secondary"
            style={{ fontSize: 11, padding: '5px 10px', color: 'var(--urgent)' }}
            disabled={pending}
          >
            {pending ? '…' : '取り消し'}
          </button>
        </form>
      </div>
      {state.status === 'error' && (
        <div style={{ gridColumn: '1 / -1', color: 'var(--urgent)', fontSize: 11 }}>
          {state.message}
        </div>
      )}
    </div>
  );
}
