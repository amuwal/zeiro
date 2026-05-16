// Authorization rules for editing the firm's supervisor tree. The same
// logic gates both the UI (to disable inputs) and the server actions (to
// reject submissions) so a sufficiently motivated user can't bypass via
// devtools.
//
// Cardinal rules:
//   1. No-one can edit their own tier (only an admin can).
//   2. No-one can edit their own supervisor (only their current supervisor
//      or an admin can — prevents the "promote myself to the top" case).
//   3. Tier promotions: actor can never promote a target above the actor's
//      own tier. Senior can promote a member they supervise to senior; only
//      admin can grant admin.
//   4. Demotions: same — actor can only demote targets at or below their
//      own tier. Last-admin protection lives in `team-guard.ts`.
//   5. Supervisor edits: admin can change anyone. Senior can change the
//      supervisor of a direct subordinate. Members never can.

import { asTier, type Tier, tierRank } from './team';

export type ActorView = {
  userId: string;
  tier: Tier;
};

export type TargetView = {
  userId: string;
  tier: Tier;
  supervisorId: string | null;
};

export function canEditTier(actor: ActorView, target: TargetView): boolean {
  if (actor.userId === target.userId) return false;
  if (actor.tier === 'admin') return true;
  // Senior may demote/promote a subordinate at member level only; cannot
  // touch other seniors or admins.
  if (actor.tier === 'senior') {
    return target.tier === 'member' && target.supervisorId === actor.userId;
  }
  return false;
}

// Which tier values is `actor` allowed to set on `target`?
export function allowedTierTargets(actor: ActorView, target: TargetView): Tier[] {
  if (!canEditTier(actor, target)) return [];
  // Admins can set anything (last-admin protection still applies in the action).
  if (actor.tier === 'admin') return ['admin', 'senior', 'member'];
  // Seniors can only set their direct subordinates between senior and member,
  // not promote to admin.
  if (actor.tier === 'senior') return ['senior', 'member'];
  return [];
}

export function canEditSupervisor(actor: ActorView, target: TargetView): boolean {
  if (actor.userId === target.userId) return false;
  if (actor.tier === 'admin') return true;
  // Seniors can reassign their direct subordinate to another supervisor —
  // but only to another supervisor whose rank >= the subordinate's after
  // the change. Concretely we check that the chosen supervisor isn't lower
  // in the tree (i.e. their supervisor chain doesn't pass through the
  // target). Cycle prevention covers that, and validateSupervisorCandidate
  // double-checks rank.
  if (actor.tier === 'senior') return target.supervisorId === actor.userId;
  return false;
}

// Which other firm members may `actor` set as `target`'s supervisor?
// Always excludes the target itself; admin can pick anyone, senior can pick
// themselves or another supervisor whose rank >= target's resulting rank.
export function allowedSupervisorCandidates(
  actor: ActorView,
  target: TargetView,
  allMembers: { userId: string; tier: Tier }[],
): string[] {
  if (!canEditSupervisor(actor, target)) return [];
  const targetRank = tierRank(target.tier);
  return allMembers
    .filter((m) => m.userId !== target.userId)
    .filter((m) => tierRank(m.tier) >= targetRank)
    .filter((m) => {
      if (actor.tier === 'admin') return true;
      // Senior can only reassign to themselves (effectively a no-op) or
      // another senior/admin who can take over the relationship.
      return tierRank(m.tier) >= tierRank('senior');
    })
    .map((m) => m.userId);
}

export function toActorView(input: { userId: string; tier: string }): ActorView {
  return { userId: input.userId, tier: asTier(input.tier) };
}

export function toTargetView(input: {
  userId: string;
  tier: string;
  supervisorId: string | null;
}): TargetView {
  return {
    userId: input.userId,
    tier: asTier(input.tier),
    supervisorId: input.supervisorId,
  };
}
