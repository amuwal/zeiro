'use client';

import type { FirmTreeNode } from '@zeiro/db';
import { useActionState, useMemo } from 'react';
import {
  removeMember,
  setMemberSupervisor,
  setMemberTier,
} from '@/app/(app)/settings/team-actions';
import { initialTeamState } from '@/app/(app)/settings/team-state';
import { Icon } from '@/components/ui/icon';
import { asTier, type Tier, tierLabel } from '@/lib/team';
import {
  allowedSupervisorCandidates,
  allowedTierTargets,
  canEditSupervisor,
  canEditTier,
  toActorView,
  toTargetView,
} from '@/lib/tree-authz';

type Props = {
  members: FirmTreeNode[];
  currentUserId: string;
  currentUserTier: Tier;
  isAdmin: boolean; // for the remove button (admin-only via Clerk)
};

type TreeRow = FirmTreeNode & { depth: number };

export function TeamTree({ members, currentUserId, currentUserTier, isAdmin }: Props) {
  const tree = useMemo(() => buildTreeOrder(members), [members]);
  const actor = toActorView({ userId: currentUserId, tier: currentUserTier });

  return (
    <div className="team-tree">
      {tree.map((node) => (
        <TreeRow key={node.id} node={node} actor={actor} allMembers={members} isAdmin={isAdmin} />
      ))}
    </div>
  );
}

function TreeRow({
  node,
  actor,
  allMembers,
  isAdmin,
}: {
  node: TreeRow;
  actor: ReturnType<typeof toActorView>;
  allMembers: FirmTreeNode[];
  isAdmin: boolean;
}) {
  const target = toTargetView({
    userId: node.id,
    tier: node.tier,
    supervisorId: node.supervisorId,
  });
  const canTier = canEditTier(actor, target);
  const canSupervisor = canEditSupervisor(actor, target);
  const isSelf = node.id === actor.userId;
  const tier = asTier(node.tier);

  return (
    <div className="tree-row" style={{ paddingLeft: 18 + node.depth * 28 }}>
      <div className="tree-rail" aria-hidden>
        {node.depth > 0 && <span className="tree-elbow" />}
      </div>

      <div className="tree-card">
        <div className="tree-card-main">
          <div className="tree-avatar" aria-hidden>
            {initial(node.name)}
          </div>
          <div className="tree-identity">
            <div className="tree-name">
              {node.name}
              {isSelf && <span className="tree-self-tag">自分</span>}
            </div>
            <div className="tree-email">{node.email}</div>
          </div>
          <TierBadge tier={tier} />
          {node.subordinates > 0 && (
            <span className="tree-subord-count">
              <Icon name="users" size={10} /> {node.subordinates}名を担当
            </span>
          )}
        </div>

        <div className="tree-card-edit">
          <TierEditor actor={actor} target={target} disabled={!canTier} currentTier={tier} />
          <SupervisorEditor
            actor={actor}
            target={target}
            disabled={!canSupervisor}
            currentSupervisorId={node.supervisorId}
            allMembers={allMembers}
          />
          {isAdmin && !isSelf && <RemoveButton clerkUserId={node.clerkUserId} />}
        </div>
      </div>
    </div>
  );
}

function TierEditor({
  actor,
  target,
  disabled,
  currentTier,
}: {
  actor: ReturnType<typeof toActorView>;
  target: ReturnType<typeof toTargetView>;
  disabled: boolean;
  currentTier: Tier;
}) {
  const [state, action, pending] = useActionState(setMemberTier, initialTeamState);
  const choices = disabled ? [currentTier] : allowedTierTargets(actor, target);
  if (choices.length === 0 || (choices.length === 1 && choices[0] === currentTier && disabled)) {
    return (
      <span className="tree-readonly">
        <Icon name="shield" size={10} /> {tierLabel(currentTier)}
      </span>
    );
  }
  return (
    <form action={action} className="tree-form">
      <input type="hidden" name="targetUserId" value={target.userId} />
      <span className="tree-label">階層</span>
      <select
        key={currentTier}
        name="tier"
        defaultValue={currentTier}
        disabled={pending}
        aria-label="階層を変更"
      >
        {Array.from(new Set([currentTier, ...choices])).map((t) => (
          <option key={t} value={t}>
            {tierLabel(t)}
          </option>
        ))}
      </select>
      <button type="submit" className="tree-apply" disabled={pending}>
        {pending ? '…' : '更新'}
      </button>
      {state.status === 'error' && <span className="tree-error">{state.message}</span>}
    </form>
  );
}

function SupervisorEditor({
  actor,
  target,
  disabled,
  currentSupervisorId,
  allMembers,
}: {
  actor: ReturnType<typeof toActorView>;
  target: ReturnType<typeof toTargetView>;
  disabled: boolean;
  currentSupervisorId: string | null;
  allMembers: FirmTreeNode[];
}) {
  const [state, action, pending] = useActionState(setMemberSupervisor, initialTeamState);
  if (disabled) {
    const sup = allMembers.find((m) => m.id === currentSupervisorId);
    return (
      <span className="tree-readonly">
        <Icon name="user" size={10} /> 上司: {sup?.name ?? '—'}
      </span>
    );
  }
  const allowed = allowedSupervisorCandidates(
    actor,
    target,
    allMembers.map((m) => ({ userId: m.id, tier: asTier(m.tier) })),
  );
  return (
    <form action={action} className="tree-form">
      <input type="hidden" name="targetUserId" value={target.userId} />
      <span className="tree-label">上司</span>
      <select
        key={currentSupervisorId ?? '__none__'}
        name="supervisorUserId"
        defaultValue={currentSupervisorId ?? ''}
        disabled={pending}
        aria-label="上司を変更"
      >
        <option value="">— なし (最上位)</option>
        {allMembers
          .filter((m) => allowed.includes(m.id))
          .map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} ({tierLabel(asTier(m.tier))})
            </option>
          ))}
      </select>
      <button type="submit" className="tree-apply" disabled={pending}>
        {pending ? '…' : '更新'}
      </button>
      {state.status === 'error' && <span className="tree-error">{state.message}</span>}
    </form>
  );
}

function RemoveButton({ clerkUserId }: { clerkUserId: string }) {
  const [state, action, pending] = useActionState(removeMember, initialTeamState);
  return (
    <form action={action}>
      <input type="hidden" name="clerkUserId" value={clerkUserId} />
      <button type="submit" className="tree-remove" disabled={pending} title="このメンバーを削除">
        <Icon name="x" size={12} />
      </button>
      {state.status === 'error' && <span className="tree-error">{state.message}</span>}
    </form>
  );
}

function TierBadge({ tier }: { tier: Tier }) {
  return <span className={`tier-mini tier-${tier}`}>{tierLabel(tier)}</span>;
}

function initial(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0) return '?';
  return trimmed.slice(0, 1).toUpperCase();
}

// Depth-first traversal that orders nodes top-to-bottom with admins first
// (no supervisor), then their direct subordinates, recursively. Members whose
// supervisor is missing (e.g. orphaned by removal) land at depth 0.
function buildTreeOrder(members: FirmTreeNode[]): TreeRow[] {
  const byId = new Map(members.map((m) => [m.id, m]));
  const children = new Map<string | null, FirmTreeNode[]>();
  for (const m of members) {
    const key = m.supervisorId && byId.has(m.supervisorId) ? m.supervisorId : null;
    const list = children.get(key) ?? [];
    list.push(m);
    children.set(key, list);
  }
  // Stable ordering within siblings: admins first, then seniors, then members,
  // then by joinedAt asc within each tier.
  const sortKey = (m: FirmTreeNode): number => {
    const tier = asTier(m.tier);
    return (tier === 'admin' ? 0 : tier === 'senior' ? 1 : 2) * 1e15 + m.joinedAt.getTime();
  };
  for (const list of children.values()) list.sort((a, b) => sortKey(a) - sortKey(b));

  const out: TreeRow[] = [];
  const visit = (parentId: string | null, depth: number) => {
    const list = children.get(parentId) ?? [];
    for (const m of list) {
      out.push({ ...m, depth });
      visit(m.id, depth + 1);
    }
  };
  visit(null, 0);
  return out;
}
