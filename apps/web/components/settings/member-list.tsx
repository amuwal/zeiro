'use client';

import { APP_ROLES, type AppRole, CLIENT_SCOPES, roleLabel } from '@zeiro/core';
import type { FirmUser } from '@zeiro/db';
import { useActionState } from 'react';
import { removeMember, setMemberRole } from '@/app/(app)/settings/team-actions';
import { initialTeamState, type TeamActionState } from '@/app/(app)/settings/team-state';

const SCOPE_LABEL: Record<string, string> = { assigned: '担当のみ', all: '全顧問先' };

export function MemberList({
  members,
  currentClerkUserId,
}: {
  members: FirmUser[];
  currentClerkUserId: string;
}) {
  if (members.length === 0) {
    return (
      <div className="px-4 py-6 text-center text-[13px] text-muted">メンバーはまだいません</div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {members.map((m) => (
        <MemberRow key={m.clerkUserId} member={m} isSelf={m.clerkUserId === currentClerkUserId} />
      ))}
    </div>
  );
}

function MemberRow({ member, isSelf }: { member: FirmUser; isSelf: boolean }) {
  const [roleState, roleAction, rolePending] = useActionState<TeamActionState, FormData>(
    setMemberRole,
    initialTeamState,
  );
  const [removeState, removeAction, removePending] = useActionState<TeamActionState, FormData>(
    removeMember,
    initialTeamState,
  );
  const role = (APP_ROLES as readonly string[]).includes(member.appRole)
    ? (member.appRole as AppRole)
    : 'staff';
  const error =
    roleState.status === 'error'
      ? roleState.message
      : removeState.status === 'error'
        ? removeState.message
        : null;
  const ok = roleState.status === 'success' ? roleState.message : null;

  return (
    <div className="rounded-md border border-line bg-surface px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="min-w-[180px] flex-1">
          <div className="text-[13px] font-medium text-ink">
            {member.name}
            {isSelf && <span className="ml-1.5 text-[11px] text-muted">(自分)</span>}
          </div>
          <div className="font-mono text-[11px] text-muted">{member.email}</div>
        </div>

        <form action={roleAction} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="clerkUserId" value={member.clerkUserId} />
          <input type="hidden" name="targetUserId" value={member.id} />
          <select
            name="appRole"
            defaultValue={role}
            className="rounded-sm border border-line bg-surface px-2 py-1 text-[11px] text-ink"
            disabled={rolePending}
          >
            {APP_ROLES.map((r) => (
              <option key={r} value={r}>
                {roleLabel(r)}
              </option>
            ))}
          </select>
          <select
            name="clientScope"
            defaultValue={member.clientScope}
            className="rounded-sm border border-line bg-surface px-2 py-1 text-[11px] text-ink"
            disabled={rolePending}
            title="閲覧できる顧問先の範囲"
          >
            {CLIENT_SCOPES.map((s) => (
              <option key={s} value={s}>
                {SCOPE_LABEL[s] ?? s}
              </option>
            ))}
          </select>
          <label
            className="flex items-center gap-1 text-[11px] text-ink-2"
            title="下書きの送信を許可"
          >
            <input type="checkbox" name="canSend" defaultChecked={member.canSend} /> 送信可
          </label>
          <button
            type="submit"
            className="rounded-sm border border-line bg-bg-2 px-2.5 py-1 text-[11px] font-medium text-ink-2 hover:bg-surface-2 disabled:opacity-60"
            disabled={rolePending}
          >
            {rolePending ? '…' : '更新'}
          </button>
        </form>

        {!isSelf && (
          <form action={removeAction}>
            <input type="hidden" name="clerkUserId" value={member.clerkUserId} />
            <button
              type="submit"
              className="rounded-sm px-2 py-1 text-[11px] font-medium text-urgent hover:bg-bg-2 disabled:opacity-60"
              disabled={removePending}
            >
              {removePending ? '…' : '削除'}
            </button>
          </form>
        )}
      </div>
      {error && <div className="mt-1.5 text-[11px] text-urgent">{error}</div>}
      {ok && <div className="mt-1.5 text-[11px] text-positive">{ok}</div>}
    </div>
  );
}
