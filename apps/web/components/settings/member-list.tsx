'use client';

import type { FirmUser } from '@zeiro/db';
import { useActionState } from 'react';
import { changeMemberRole, removeMember } from '@/app/(app)/settings/team-actions';
import { initialTeamState, type TeamActionState } from '@/app/(app)/settings/team-state';
import { type ClerkRole, isAdminRole, normaliseRole } from '@/lib/team';

type Props = {
  members: FirmUser[];
  currentClerkUserId: string;
};

export function MemberList({ members, currentClerkUserId }: Props) {
  if (members.length === 0) {
    return <div style={emptyStyle}>メンバーはまだいません</div>;
  }

  return (
    <div className="member-table">
      <div className="member-row head">
        <div>名前</div>
        <div>メール</div>
        <div>役割</div>
        <div>参加日</div>
        <div>操作</div>
      </div>
      {members.map((m) => (
        <MemberRow key={m.clerkUserId} member={m} isSelf={m.clerkUserId === currentClerkUserId} />
      ))}
    </div>
  );
}

function MemberRow({ member, isSelf }: { member: FirmUser; isSelf: boolean }) {
  const [roleState, roleAction, rolePending] = useActionState<TeamActionState, FormData>(
    changeMemberRole,
    initialTeamState,
  );
  const [removeState, removeAction, removePending] = useActionState<TeamActionState, FormData>(
    removeMember,
    initialTeamState,
  );
  const currentRole: ClerkRole = normaliseRole(member.role);
  const errorMessage =
    roleState.status === 'error'
      ? roleState.message
      : removeState.status === 'error'
        ? removeState.message
        : null;

  return (
    <div className="member-row">
      <div className="member-cell">
        <div>
          {member.name}
          {isSelf && <span className="member-self">(自分)</span>}
        </div>
        {isAdminRole(member.role) && <div className="member-role-tag">所長</div>}
      </div>
      <div className="member-mono">{member.email}</div>
      <div>
        <form action={roleAction} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input type="hidden" name="clerkUserId" value={member.clerkUserId} />
          <select
            name="role"
            defaultValue={currentRole}
            disabled={isSelf || rolePending}
            style={selectStyle}
          >
            <option value="org:admin">所長</option>
            <option value="org:member">メンバー</option>
          </select>
          {!isSelf && (
            <button
              type="submit"
              className="btn btn-secondary"
              style={{ fontSize: 11, padding: '5px 8px' }}
              disabled={rolePending}
            >
              {rolePending ? '…' : '更新'}
            </button>
          )}
        </form>
      </div>
      <div className="member-mono">
        {member.joinedAt.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
      </div>
      <div>
        {!isSelf && (
          <form action={removeAction}>
            <input type="hidden" name="clerkUserId" value={member.clerkUserId} />
            <button
              type="submit"
              className="btn btn-secondary"
              style={{ fontSize: 11, padding: '5px 10px', color: 'var(--urgent)' }}
              disabled={removePending}
            >
              {removePending ? '…' : '削除'}
            </button>
          </form>
        )}
      </div>
      {errorMessage && (
        <div style={{ gridColumn: '1 / -1', color: 'var(--urgent)', fontSize: 11 }}>
          {errorMessage}
        </div>
      )}
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  padding: '5px 8px',
  border: '1px solid var(--line)',
  borderRadius: 6,
  background: 'var(--surface)',
  fontSize: 12,
};

const emptyStyle: React.CSSProperties = {
  padding: '24px 16px',
  textAlign: 'center',
  color: 'var(--muted)',
  fontSize: 13,
};
