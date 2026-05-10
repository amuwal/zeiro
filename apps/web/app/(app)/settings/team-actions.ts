'use server';

import { clerkClient } from '@clerk/nextjs/server';
import { recordAudit } from '@zeiro/db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { ensureNotLastAdmin, extractClerkError, requireAdminFirm } from '@/lib/team-guard';
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
