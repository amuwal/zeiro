'use server';

import { clerkClient } from '@clerk/nextjs/server';
import {
  countAdmins,
  getMembership,
  listFirmTree,
  recordAudit,
  setMembershipSupervisor,
  setMembershipTier,
  wouldCreateSupervisorCycle,
} from '@zeiro/db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireFirmContext } from '@/lib/firm-context';
import { asTier, TIERS } from '@/lib/team';
import { ensureNotLastAdmin, extractClerkError, requireAdminFirm } from '@/lib/team-guard';
import {
  allowedSupervisorCandidates,
  allowedTierTargets,
  canEditSupervisor,
  canEditTier,
  toActorView,
  toTargetView,
} from '@/lib/tree-authz';
import type { TeamActionState } from './team-state';

const clerkRoleEnum = z.enum(['org:admin', 'org:member']);

const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  role: clerkRoleEnum,
});

const memberOpSchema = z.object({
  clerkUserId: z.string().trim().min(1),
  role: clerkRoleEnum.optional(),
});

const invitationOpSchema = z.object({
  invitationId: z.string().trim().min(1),
});

export async function inviteMember(
  _prev: TeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  const guard = await requireAdminFirm();
  if (!guard.ok) return { status: 'error', message: guard.message };

  const parsed = inviteSchema.safeParse({
    email: formData.get('email'),
    role: formData.get('role'),
  });
  if (!parsed.success) return { status: 'error', message: '入力内容を確認してください' };

  try {
    const cc = await clerkClient();
    await cc.organizations.createOrganizationInvitation({
      organizationId: guard.organizationId,
      emailAddress: parsed.data.email,
      role: parsed.data.role,
      inviterUserId: guard.actorClerkUserId,
    });
  } catch (e) {
    return { status: 'error', message: extractClerkError(e) };
  }

  await recordAudit({
    firmId: guard.ctx.firmId,
    actorId: guard.ctx.userId,
    inquiryId: null,
    action: 'member.invited',
    metadata: { email: parsed.data.email, role: parsed.data.role },
  });
  revalidatePath('/settings');
  return { status: 'success', message: `${parsed.data.email} に招待を送信しました` };
}

export async function changeMemberRole(
  _prev: TeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  const guard = await requireAdminFirm();
  if (!guard.ok) return { status: 'error', message: guard.message };

  const parsed = memberOpSchema.safeParse({
    clerkUserId: formData.get('clerkUserId'),
    role: formData.get('role'),
  });
  if (!parsed.success || !parsed.data.role) {
    return { status: 'error', message: '入力内容を確認してください' };
  }
  if (parsed.data.clerkUserId === guard.actorClerkUserId) {
    return { status: 'error', message: '自分自身の権限は変更できません' };
  }

  const safety = await ensureNotLastAdmin(
    guard.ctx.firmId,
    parsed.data.clerkUserId,
    parsed.data.role,
  );
  if (!safety.ok) return { status: 'error', message: safety.message };

  try {
    const cc = await clerkClient();
    await cc.organizations.updateOrganizationMembership({
      organizationId: guard.organizationId,
      userId: parsed.data.clerkUserId,
      role: parsed.data.role,
    });
  } catch (e) {
    return { status: 'error', message: extractClerkError(e) };
  }

  await recordAudit({
    firmId: guard.ctx.firmId,
    actorId: guard.ctx.userId,
    inquiryId: null,
    action: 'member.role_changed',
    metadata: { targetClerkUserId: parsed.data.clerkUserId, newRole: parsed.data.role },
  });
  revalidatePath('/settings');
  return { status: 'success', message: '権限を更新しました' };
}

export async function removeMember(
  _prev: TeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  const guard = await requireAdminFirm();
  if (!guard.ok) return { status: 'error', message: guard.message };

  const parsed = memberOpSchema.safeParse({ clerkUserId: formData.get('clerkUserId') });
  if (!parsed.success) return { status: 'error', message: '入力内容を確認してください' };
  if (parsed.data.clerkUserId === guard.actorClerkUserId) {
    return { status: 'error', message: '自分自身を削除することはできません' };
  }

  const safety = await ensureNotLastAdmin(guard.ctx.firmId, parsed.data.clerkUserId, null);
  if (!safety.ok) return { status: 'error', message: safety.message };

  try {
    const cc = await clerkClient();
    await cc.organizations.deleteOrganizationMembership({
      organizationId: guard.organizationId,
      userId: parsed.data.clerkUserId,
    });
  } catch (e) {
    return { status: 'error', message: extractClerkError(e) };
  }

  await recordAudit({
    firmId: guard.ctx.firmId,
    actorId: guard.ctx.userId,
    inquiryId: null,
    action: 'member.removed',
    metadata: { targetClerkUserId: parsed.data.clerkUserId },
  });
  revalidatePath('/settings');
  return { status: 'success', message: 'メンバーを削除しました' };
}

export async function revokeInvitation(
  _prev: TeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  const guard = await requireAdminFirm();
  if (!guard.ok) return { status: 'error', message: guard.message };

  const parsed = invitationOpSchema.safeParse({ invitationId: formData.get('invitationId') });
  if (!parsed.success) return { status: 'error', message: '入力内容を確認してください' };

  try {
    const cc = await clerkClient();
    await cc.organizations.revokeOrganizationInvitation({
      organizationId: guard.organizationId,
      invitationId: parsed.data.invitationId,
      requestingUserId: guard.actorClerkUserId,
    });
  } catch (e) {
    return { status: 'error', message: extractClerkError(e) };
  }

  await recordAudit({
    firmId: guard.ctx.firmId,
    actorId: guard.ctx.userId,
    inquiryId: null,
    action: 'invitation.revoked',
    metadata: { invitationId: parsed.data.invitationId },
  });
  revalidatePath('/settings');
  return { status: 'success', message: '招待を取り消しました' };
}

// ---------- tier (admin / senior / member) ----------

const tierEnum = z.enum(TIERS);
const tierOpSchema = z.object({
  targetUserId: z.string().uuid(),
  tier: tierEnum,
});

export async function setMemberTier(
  _prev: TeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  const ctx = await requireFirmContext();
  const parsed = tierOpSchema.safeParse({
    targetUserId: formData.get('targetUserId'),
    tier: formData.get('tier'),
  });
  if (!parsed.success) return { status: 'error', message: '入力内容を確認してください' };

  const [actorMembership, targetMembership] = await Promise.all([
    getMembership(ctx.userId, ctx.firmId),
    getMembership(parsed.data.targetUserId, ctx.firmId),
  ]);
  if (!actorMembership || !targetMembership) {
    return { status: 'error', message: 'メンバーが見つかりません' };
  }

  const actor = toActorView({ userId: ctx.userId, tier: actorMembership.tier });
  const target = toTargetView({
    userId: targetMembership.userId,
    tier: targetMembership.tier,
    supervisorId: targetMembership.supervisorId,
  });

  if (!canEditTier(actor, target)) {
    return { status: 'error', message: 'この権限を変更する権限がありません' };
  }
  if (!allowedTierTargets(actor, target).includes(parsed.data.tier)) {
    return { status: 'error', message: '指定された権限には変更できません' };
  }

  // Demoting an admin: last-admin protection. We mirror the same check the
  // Clerk role flow uses so the two paths can't disagree.
  if (asTier(targetMembership.tier) === 'admin' && parsed.data.tier !== 'admin') {
    const adminCount = await countAdmins(ctx.firmId);
    if (adminCount <= 1) {
      return { status: 'error', message: '最後の管理者を降格することはできません' };
    }
  }

  await setMembershipTier({
    firmId: ctx.firmId,
    userId: parsed.data.targetUserId,
    tier: parsed.data.tier,
  });

  await recordAudit({
    firmId: ctx.firmId,
    actorId: ctx.userId,
    inquiryId: null,
    action: 'member.role_changed',
    metadata: {
      op: 'tier_changed',
      targetUserId: parsed.data.targetUserId,
      fromTier: targetMembership.tier,
      toTier: parsed.data.tier,
    },
  });
  revalidatePath('/settings');
  return { status: 'success', message: '階層を更新しました' };
}

// ---------- supervisor ----------

const supervisorOpSchema = z.object({
  targetUserId: z.string().uuid(),
  // Empty string clears the supervisor (top-of-tree).
  supervisorUserId: z.string().uuid().or(z.literal('')),
});

export async function setMemberSupervisor(
  _prev: TeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  const ctx = await requireFirmContext();
  const parsed = supervisorOpSchema.safeParse({
    targetUserId: formData.get('targetUserId'),
    supervisorUserId: formData.get('supervisorUserId') ?? '',
  });
  if (!parsed.success) return { status: 'error', message: '入力内容を確認してください' };

  const nextSupervisorId =
    parsed.data.supervisorUserId === '' ? null : parsed.data.supervisorUserId;

  const [actorMembership, targetMembership, members] = await Promise.all([
    getMembership(ctx.userId, ctx.firmId),
    getMembership(parsed.data.targetUserId, ctx.firmId),
    listFirmTree(ctx.firmId),
  ]);
  if (!actorMembership || !targetMembership) {
    return { status: 'error', message: 'メンバーが見つかりません' };
  }

  const actor = toActorView({ userId: ctx.userId, tier: actorMembership.tier });
  const target = toTargetView({
    userId: targetMembership.userId,
    tier: targetMembership.tier,
    supervisorId: targetMembership.supervisorId,
  });

  if (!canEditSupervisor(actor, target)) {
    return { status: 'error', message: 'この上司を変更する権限がありません' };
  }
  if (nextSupervisorId !== null) {
    const allowed = allowedSupervisorCandidates(
      actor,
      target,
      members.map((m) => ({ userId: m.id, tier: asTier(m.tier) })),
    );
    if (!allowed.includes(nextSupervisorId)) {
      return { status: 'error', message: '指定された上司には設定できません' };
    }
    const wouldLoop = await wouldCreateSupervisorCycle(
      ctx.firmId,
      parsed.data.targetUserId,
      nextSupervisorId,
    );
    if (wouldLoop) {
      return { status: 'error', message: '循環参照になるため設定できません' };
    }
  }

  await setMembershipSupervisor({
    firmId: ctx.firmId,
    userId: parsed.data.targetUserId,
    supervisorId: nextSupervisorId,
  });

  await recordAudit({
    firmId: ctx.firmId,
    actorId: ctx.userId,
    inquiryId: null,
    action: 'member.role_changed',
    metadata: {
      op: 'supervisor_changed',
      targetUserId: parsed.data.targetUserId,
      fromSupervisorId: targetMembership.supervisorId,
      toSupervisorId: nextSupervisorId,
    },
  });
  revalidatePath('/settings');
  return { status: 'success', message: '上司を更新しました' };
}
