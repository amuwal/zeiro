import { auth } from '@clerk/nextjs/server';
import { countAdmins, findUserByClerkUserId, getFirm, getMembership } from '@zeiro/db';
import { requireFirmContext } from '@/lib/firm-context';
import { type ClerkRole, isAdminRole } from '@/lib/team';

export type AdminGuard =
  | { ok: false; message: string }
  | {
      ok: true;
      ctx: { firmId: string; userId: string; role: string };
      organizationId: string;
      actorClerkUserId: string;
    };

export async function requireAdminFirm(): Promise<AdminGuard> {
  const ctx = await requireFirmContext();
  // Member management is owner-only (ctx.role is the appRole, not the Clerk role).
  if (ctx.role !== 'owner') {
    return { ok: false, message: '権限がありません (所長のみ)' };
  }
  const { userId: actorClerkUserId } = await auth();
  if (!actorClerkUserId) {
    return { ok: false, message: 'セッションが見つかりません' };
  }
  const firm = await getFirm(ctx.firmId);
  if (!firm.clerkOrgId) {
    return { ok: false, message: 'Clerk 組織が紐付いていません' };
  }
  return { ok: true, ctx, organizationId: firm.clerkOrgId, actorClerkUserId };
}

export async function ensureNotLastAdmin(
  firmId: string,
  targetClerkUserId: string,
  newRole: ClerkRole | null,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const adminCount = await countAdmins(firmId);
  if (adminCount > 1) return { ok: true };

  const user = await findUserByClerkUserId(targetClerkUserId);
  if (!user) return { ok: true };
  const target = await getMembership(user.id, firmId);
  if (!target) return { ok: true };

  const targetIsAdmin = isAdminRole(target.role);
  const willStillBeAdmin = newRole === null ? false : isAdminRole(newRole);
  if (targetIsAdmin && !willStillBeAdmin) {
    return { ok: false, message: '最後の管理者を削除・降格することはできません' };
  }
  return { ok: true };
}

export function extractClerkError(e: unknown): string {
  if (e && typeof e === 'object' && 'errors' in e) {
    const errs = (e as { errors: Array<{ message?: string }> }).errors;
    if (Array.isArray(errs) && errs[0]?.message) return errs[0].message;
  }
  if (e instanceof Error) return e.message;
  return '操作に失敗しました';
}
