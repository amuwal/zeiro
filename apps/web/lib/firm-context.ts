import { auth } from '@clerk/nextjs/server';
import { type AppRole, asAppRole, asClientScope, type ClientScope } from '@zeiro/core';
import { findFirmByClerkOrgId, findUserByClerkUserId, getMembership } from '@zeiro/db';
import { redirect } from 'next/navigation';
import { cache } from 'react';

export type FirmContext = {
  firmId: string;
  userId: string;
  // Authoritative authorization role (owner/reviewer/staff/viewer).
  role: AppRole;
  // Per-user send capability (staff is gate-able; owner/reviewer default on).
  canSend: boolean;
  // Whether the user sees all clients or only their assigned ones.
  clientScope: ClientScope;
  // Clerk org role string ('org:admin' | 'org:member') — billing-admin mirror only.
  clerkRole: string;
  // First-run onboarding wizard completed (firm.settings.onboardingCompleted).
  onboardingCompleted: boolean;
};

export const NO_AUTH = 'NO_AUTH' as const;
export const NO_ORG = 'NO_ORG' as const;
export const NOT_PROVISIONED = 'NOT_PROVISIONED' as const;

type ContextResult =
  | { ok: true; ctx: FirmContext }
  | { ok: false; reason: typeof NO_AUTH | typeof NO_ORG | typeof NOT_PROVISIONED };

export const getFirmContext = cache(async (): Promise<ContextResult> => {
  const { userId: clerkUserId, orgId: clerkOrgId } = await auth();
  if (!clerkUserId) return { ok: false, reason: NO_AUTH };
  if (!clerkOrgId) return { ok: false, reason: NO_ORG };

  const [firm, user] = await Promise.all([
    findFirmByClerkOrgId(clerkOrgId),
    findUserByClerkUserId(clerkUserId),
  ]);
  if (!firm || !user) return { ok: false, reason: NOT_PROVISIONED };

  const membership = await getMembership(user.id, firm.id);
  if (!membership) return { ok: false, reason: NOT_PROVISIONED };

  return {
    ok: true,
    ctx: {
      firmId: firm.id,
      userId: user.id,
      role: asAppRole(membership.appRole),
      canSend: membership.canSend,
      clientScope: asClientScope(membership.clientScope),
      clerkRole: membership.role,
      onboardingCompleted:
        ((firm.settings ?? {}) as Record<string, unknown>).onboardingCompleted === true,
    },
  };
});

export async function requireFirmContext(): Promise<FirmContext> {
  const result = await getFirmContext();
  if (result.ok) return result.ctx;
  if (result.reason === NO_AUTH) redirect('/sign-in');
  if (result.reason === NO_ORG) redirect('/onboarding');
  redirect('/onboarding?reason=not_provisioned');
}
