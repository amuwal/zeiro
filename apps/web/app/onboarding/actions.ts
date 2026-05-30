'use server';

import { updateFirmProfile } from '@zeiro/db';
import { revalidatePath } from 'next/cache';
import { requireCan } from '@/lib/authz';

export type FirmProfileState = { ok: boolean; error: string | null };

// Step 1 of onboarding: capture the real 事務所名 (overrides the Clerk org name,
// which would otherwise appear in every client-facing draft) + an optional 担当者
// 署名. Owner-only.
export async function saveFirmProfileAction(formData: FormData): Promise<FirmProfileState> {
  const { firmId } = await requireCan('member.manage');
  const name = String(formData.get('name') ?? '').trim();
  const signature = String(formData.get('signature') ?? '').trim();
  if (!name) return { ok: false, error: '事務所名を入力してください' };
  if (name.length > 120) return { ok: false, error: '事務所名は120文字以内で入力してください' };
  await updateFirmProfile(firmId, { name, signature: signature || null });
  revalidatePath('/onboarding/welcome');
  revalidatePath('/home');
  return { ok: true, error: null };
}

export async function completeOnboardingAction(): Promise<void> {
  const { firmId } = await requireCan('member.manage');
  await updateFirmProfile(firmId, { onboardingCompleted: true });
  revalidatePath('/home');
}
