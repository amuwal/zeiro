'use server';

import { clientContractTypeSchema, clientCreateInputSchema } from '@zeiro/core';
import {
  archiveClient,
  createClient,
  deleteClient,
  promoteAllUnmatchedFromSender,
  recordAudit,
  unarchiveClient,
  updateClient,
} from '@zeiro/db';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireFirmContext } from '@/lib/firm-context';
import { inngest } from '@/lib/inngest/client';
import type { ClientFormState, DeleteClientState } from './state';

export async function createClientAction(
  _prev: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  const { firmId, userId } = await requireFirmContext();
  const promoteInquiryId = emptyToNull(formData.get('promoteInquiryId'));
  const fromEmailFlow = promoteInquiryId !== null;
  const parsed = clientCreateInputSchema.safeParse({
    name: formData.get('name'),
    primaryEmail: formData.get('primaryEmail'),
    contractType: formData.get('contractType'),
    assignedTaxAccountantId: emptyToNull(formData.get('assignedTaxAccountantId')),
    notes: emptyToNull(formData.get('notes')),
    source: fromEmailFlow ? 'email_promotion' : 'manual',
  });
  if (!parsed.success) {
    return { status: 'error', ...flattenZod(parsed.error) };
  }

  const result = await createClient(firmId, {
    name: parsed.data.name,
    primaryEmail: parsed.data.primaryEmail,
    contractType: parsed.data.contractType,
    assignedTaxAccountantId: parsed.data.assignedTaxAccountantId ?? null,
    notes: parsed.data.notes ?? null,
    source: parsed.data.source,
    createdBy: userId,
  });
  if (!result.ok) {
    return {
      status: 'error',
      message: 'すでに登録されているメールアドレスです',
      fieldErrors: { primaryEmail: '同じメールアドレスの顧問先が存在します' },
    };
  }

  let promotedIds: string[] = [];
  if (promoteInquiryId) {
    // Registering this sender as a client implicitly promotes EVERY unmatched
    // inquiry from the same address — the firm rarely wants 5 emails from the same
    // person to keep sitting in the unmatched bucket after they decide that person
    // is a real client. Each promoted inquiry re-enters the AI pipeline.
    promotedIds = await promoteAllUnmatchedFromSender(
      firmId,
      parsed.data.primaryEmail,
      result.id,
      parsed.data.assignedTaxAccountantId ?? null,
    );
    for (const id of promotedIds) {
      await inngest.send({
        name: 'inquiry.queued',
        data: { firmId, inquiryId: id },
        id: `inquiry-promoted-${id}`,
      });
    }
    revalidatePath('/inbox');
    for (const id of promotedIds) revalidatePath(`/inbox/${id}`);
  }

  await recordAudit({
    firmId,
    actorId: userId,
    inquiryId: promoteInquiryId,
    action: fromEmailFlow ? 'client.promoted_from_email' : 'client.created',
    metadata: {
      clientId: result.id,
      name: parsed.data.name,
      primaryEmail: parsed.data.primaryEmail,
      contractType: parsed.data.contractType,
      source: parsed.data.source,
      ...(promoteInquiryId ? { fromInquiryId: promoteInquiryId } : {}),
      ...(fromEmailFlow ? { promotedInquiryCount: promotedIds.length } : {}),
    },
  });

  revalidatePath('/clients');
  if (promoteInquiryId) redirect(`/inbox/${promoteInquiryId}?promoted=${promotedIds.length}`);
  redirect(`/clients/${result.id}?created=1`);
}

const updateInputSchema = z.object({
  name: z.string().min(1).max(120),
  contractType: clientContractTypeSchema,
  assignedTaxAccountantId: z.string().uuid().nullable(),
  notes: z.string().max(2000).nullable(),
});

export async function updateClientAction(
  _prev: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  const { firmId, userId } = await requireFirmContext();
  const id = readId(formData);
  const parsed = updateInputSchema.safeParse({
    name: formData.get('name'),
    contractType: formData.get('contractType'),
    assignedTaxAccountantId: emptyToNull(formData.get('assignedTaxAccountantId')),
    notes: emptyToNull(formData.get('notes')),
  });
  if (!parsed.success) {
    return { status: 'error', ...flattenZod(parsed.error) };
  }

  await updateClient(firmId, id, parsed.data);
  await recordAudit({
    firmId,
    actorId: userId,
    inquiryId: null,
    action: 'client.updated',
    metadata: {
      clientId: id,
      changes: parsed.data as Record<string, unknown>,
    },
  });

  revalidatePath('/clients');
  revalidatePath(`/clients/${id}`);
  return { status: 'success', clientId: id };
}

export async function archiveClientAction(formData: FormData): Promise<void> {
  const { firmId, userId } = await requireFirmContext();
  const id = readId(formData);
  await archiveClient(firmId, id, userId);
  await recordAudit({
    firmId,
    actorId: userId,
    inquiryId: null,
    action: 'client.archived',
    metadata: { clientId: id },
  });
  revalidatePath('/clients');
  revalidatePath(`/clients/${id}`);
}

export async function unarchiveClientAction(formData: FormData): Promise<void> {
  const { firmId, userId } = await requireFirmContext();
  const id = readId(formData);
  await unarchiveClient(firmId, id);
  await recordAudit({
    firmId,
    actorId: userId,
    inquiryId: null,
    action: 'client.unarchived',
    metadata: { clientId: id },
  });
  revalidatePath('/clients');
  revalidatePath(`/clients/${id}`);
}

export async function deleteClientAction(
  _prev: DeleteClientState,
  formData: FormData,
): Promise<DeleteClientState> {
  const { firmId, userId } = await requireFirmContext();
  const id = readId(formData);
  const result = await deleteClient(firmId, id);
  if (!result.ok) {
    return {
      status: 'error',
      message: `この顧問先には ${result.inquiryCount} 件の問い合わせが残っています。削除する代わりにアーカイブしてください。`,
    };
  }
  await recordAudit({
    firmId,
    actorId: userId,
    inquiryId: null,
    action: 'client.deleted',
    metadata: { clientId: id },
  });
  revalidatePath('/clients');
  redirect('/clients?deleted=1');
}

function readId(formData: FormData): string {
  const id = formData.get('clientId');
  if (typeof id !== 'string') throw new Error('missing clientId');
  return id;
}

function emptyToNull(value: FormDataEntryValue | null): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function flattenZod(error: z.ZodError): { message: string; fieldErrors: Record<string, string> } {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path[0];
    if (typeof path === 'string' && !fieldErrors[path]) {
      fieldErrors[path] = issue.message;
    }
  }
  return { message: '入力内容を確認してください', fieldErrors };
}
