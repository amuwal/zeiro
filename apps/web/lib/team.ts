// Two-axis membership model:
//   • `role`  mirrors Clerk's org role. Keeps Clerk as source of truth for
//             org membership and billing-level admin.
//   • `tier`  is the in-app workflow hierarchy used for escalation routing
//             and authorization-on-edit. Initialised from Clerk admin status
//             but `senior` is an in-app promotion that doesn't touch Clerk.

export type ClerkRole = 'org:admin' | 'org:member';

export const TIERS = ['admin', 'senior', 'member'] as const;
export type Tier = (typeof TIERS)[number];

export type PendingInvitation = {
  id: string;
  emailAddress: string;
  role: ClerkRole;
  createdAt: Date;
};

export function normaliseRole(role: string): ClerkRole {
  return role.toLowerCase().includes('admin') ? 'org:admin' : 'org:member';
}

export function isAdminRole(role: string): boolean {
  return role.toLowerCase().includes('admin');
}

export function asTier(tier: string | null | undefined): Tier {
  if (tier === 'admin' || tier === 'senior' || tier === 'member') return tier;
  return 'member';
}

// Numeric rank so call sites can write `tierRank(a) > tierRank(b)` instead of
// switch statements. Admin > senior > member.
export function tierRank(tier: Tier): number {
  if (tier === 'admin') return 2;
  if (tier === 'senior') return 1;
  return 0;
}

export function tierFromClerkRole(role: string): Tier {
  return isAdminRole(role) ? 'admin' : 'member';
}

// When Clerk pushes a role update, reconcile with whatever the app has
// already set. Clerk admin always overrides (admin is admin), but Clerk
// member doesn't downgrade an existing `senior` set in our UI.
export function reconcileTier(args: { clerkRole: string; currentTier: Tier | null }): Tier {
  if (isAdminRole(args.clerkRole)) return 'admin';
  if (args.currentTier === 'senior') return 'senior';
  return 'member';
}

export function roleLabel(role: ClerkRole): string {
  return role === 'org:admin' ? '所長 (管理者)' : 'メンバー';
}

export function tierLabel(tier: Tier): string {
  if (tier === 'admin') return '所長';
  if (tier === 'senior') return '上席';
  return '担当';
}
