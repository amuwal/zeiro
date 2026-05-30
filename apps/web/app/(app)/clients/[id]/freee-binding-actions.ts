'use server';

import { deleteBinding, recordAudit, upsertBinding } from '@zeiro/db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireCan } from '@/lib/authz';

const bindSchema = z.object({
  clientId: z.string().uuid(),
  externalId: z.string().regex(/^\d+$/, '事業所IDは数値です'),
  externalName: z.string().optional(),
});

export async function bindClientToFreee(formData: FormData): Promise<void> {
  const ctx = await requireCan('integration.manage');
  const parsed = bindSchema.safeParse({
    clientId: formData.get('clientId'),
    externalId: formData.get('externalId'),
    externalName: formData.get('externalName') ?? undefined,
  });
  if (!parsed.success) throw new Error('invalid input');

  await upsertBinding({
    firmId: ctx.firmId,
    clientId: parsed.data.clientId,
    provider: 'freee',
    externalId: parsed.data.externalId,
    externalName: parsed.data.externalName ?? null,
  });
  await recordAudit({
    firmId: ctx.firmId,
    actorId: ctx.userId,
    inquiryId: null,
    action: 'integration.binding_created',
    metadata: {
      provider: 'freee',
      clientId: parsed.data.clientId,
      externalId: parsed.data.externalId,
    },
  });
  revalidatePath(`/clients/${parsed.data.clientId}`);
}

const unbindSchema = z.object({ clientId: z.string().uuid() });

export async function unbindClientFromFreee(formData: FormData): Promise<void> {
  const ctx = await requireCan('integration.manage');
  const parsed = unbindSchema.safeParse({ clientId: formData.get('clientId') });
  if (!parsed.success) throw new Error('invalid input');
  await deleteBinding(ctx.firmId, parsed.data.clientId, 'freee');
  await recordAudit({
    firmId: ctx.firmId,
    actorId: ctx.userId,
    inquiryId: null,
    action: 'integration.binding_removed',
    metadata: { provider: 'freee', clientId: parsed.data.clientId },
  });
  revalidatePath(`/clients/${parsed.data.clientId}`);
}
