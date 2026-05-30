'use server';

import { clientContractTypeSchema, clientCreateInputSchema } from '@zeiro/core';
import {
  archiveClient,
  completeClientImport,
  createClient,
  createClientImport,
  deleteClient,
  failClientImport,
  getClientImport,
  listClientEmails,
  markClientImportImporting,
  promoteAllUnmatchedFromSender,
  recordAudit,
  unarchiveClient,
  updateClient,
} from '@zeiro/db';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireCan } from '@/lib/authz';
import { requireFirmContext } from '@/lib/firm-context';
import { inngest } from '@/lib/inngest/client';
import type { ClientFormState, DeleteClientState } from './state';

export async function createClientAction(
  _prev: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  const { firmId, userId } = await requireCan('client.manage');
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
  const { firmId, userId } = await requireCan('client.manage');
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
  const { firmId, userId } = await requireCan('client.manage');
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
  const { firmId, userId } = await requireCan('client.manage');
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
  const { firmId, userId } = await requireCan('client.manage');
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

// ---------- bulk import ----------

const MAX_IMPORT_BYTES = 5 * 1024 * 1024; // 5 MiB — sheetjs handles way bigger but typical 顧問先 lists fit comfortably

export type ImportUploadState = { error: string | null; importId?: string };

export async function uploadClientImport(
  _prev: ImportUploadState,
  formData: FormData,
): Promise<ImportUploadState> {
  const { firmId, userId } = await requireCan('client.manage');
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'CSV または Excel ファイルを選択してください' };
  }
  if (file.size > MAX_IMPORT_BYTES) {
    return {
      error: `ファイルサイズの上限 (${Math.round(MAX_IMPORT_BYTES / 1024 / 1024)}MB) を超えています`,
    };
  }
  if (!isAcceptedImportType(file.name, file.type)) {
    return { error: '対応形式: .csv / .xlsx / .xls' };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const importRow = await createClientImport({
    firmId,
    actorId: userId,
    filename: file.name,
    ...(file.type ? { mimetype: file.type } : {}),
    bytes: buffer,
  });

  await inngest.send({
    name: 'clients.import_uploaded',
    data: { importId: importRow.id, firmId, actorId: userId },
  });

  redirect(`/clients/import/${importRow.id}`);
}

const confirmRowSchema = z.object({
  name: z.string().min(1).max(120),
  primaryEmail: z.string().email().toLowerCase(),
  contractType: clientContractTypeSchema.optional(),
  notes: z.string().max(2000).nullable().optional(),
});

const confirmPayloadSchema = z.object({
  rows: z.array(confirmRowSchema),
});

// Confirms a preview the worker prepared. Client-side serializes the user's
// edited preview as JSON in a hidden field; we re-validate every row server-
// side because the user might paste weirdness into the rendered inputs.
// Always redirects on success or failure — errors surface via the
// /clients/import/[id] page when the import row's status flips to failed.
export async function confirmClientImport(formData: FormData): Promise<void> {
  const { firmId, userId } = await requireCan('client.manage');
  const importId = formData.get('importId');
  if (typeof importId !== 'string') throw new Error('importId required');

  const payloadRaw = formData.get('rows');
  if (typeof payloadRaw !== 'string') throw new Error('rows payload required');

  let rows: z.infer<typeof confirmRowSchema>[];
  try {
    rows = confirmPayloadSchema.parse(JSON.parse(payloadRaw)).rows;
  } catch {
    await failClientImport({
      firmId,
      importId,
      errorCode: 'invalid_payload',
      errorMessage: '行データの形式が不正です',
    });
    redirect(`/clients/import/${importId}`);
  }

  const importRow = await getClientImport(firmId, importId);
  if (!importRow || importRow.status !== 'preview') {
    redirect(`/clients/import/${importId}`);
  }

  // Dedupe inside the submitted set on primaryEmail, last write wins — so
  // tax accountants don't get errors when their CSV has the same client
  // mentioned twice (very common when sheets come from multiple sources).
  const byEmail = new Map<string, z.infer<typeof confirmRowSchema>>();
  for (const row of rows) byEmail.set(row.primaryEmail, row);

  // Pre-fetch existing emails so duplicates surface as `skipped`, not
  // database errors. The unique constraint on (firmId, primaryEmail) would
  // also block them, but explicit handling gives an honest summary count.
  const existingEmails = await listClientEmails(firmId);

  await markClientImportImporting(firmId, importId);

  let imported = 0;
  let skipped = 0;
  for (const row of byEmail.values()) {
    if (existingEmails.has(row.primaryEmail)) {
      skipped += 1;
      continue;
    }
    const result = await createClient(firmId, {
      name: row.name,
      primaryEmail: row.primaryEmail,
      contractType: row.contractType ?? 'unverified',
      assignedTaxAccountantId: null,
      notes: row.notes ?? null,
      source: 'csv',
      createdBy: userId,
    });
    if (result.ok) {
      imported += 1;
      existingEmails.add(row.primaryEmail);
    } else {
      skipped += 1;
    }
  }

  await completeClientImport({ firmId, importId, importedCount: imported, skippedCount: skipped });
  await recordAudit({
    firmId,
    actorId: userId,
    inquiryId: null,
    action: 'client.created',
    metadata: {
      op: 'csv_import',
      importId,
      filename: importRow.filename,
      imported,
      skipped,
    },
  });

  revalidatePath('/clients');
  revalidatePath(`/clients/import/${importId}`);
  redirect(`/clients?imported=${imported}&skipped=${skipped}`);
}

export async function cancelClientImport(formData: FormData): Promise<void> {
  const { firmId, userId } = await requireCan('client.manage');
  const importId = formData.get('importId');
  if (typeof importId !== 'string') return;
  const importRow = await getClientImport(firmId, importId);
  if (!importRow) return;
  await failClientImport({
    firmId,
    importId,
    errorCode: 'cancelled',
    errorMessage: '取り込みをキャンセルしました',
  });
  await recordAudit({
    firmId,
    actorId: userId,
    inquiryId: null,
    action: 'client.created',
    metadata: { op: 'csv_import_cancelled', importId, filename: importRow.filename },
  });
  revalidatePath('/clients');
  redirect('/clients');
}

export async function revalidateImportPreview(formData: FormData) {
  await requireFirmContext();
  const importId = formData.get('importId');
  if (typeof importId !== 'string') return;
  revalidatePath(`/clients/import/${importId}`);
}

function isAcceptedImportType(name: string, mime: string): boolean {
  const lower = name.toLowerCase();
  if (lower.endsWith('.csv') || lower.endsWith('.xlsx') || lower.endsWith('.xls')) return true;
  if (mime === 'text/csv') return true;
  if (mime === 'application/vnd.ms-excel') return true;
  if (mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
    return true;
  }
  return false;
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
