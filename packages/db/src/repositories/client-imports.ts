import type { Prisma } from '@prisma/client';
import type { ImportPreview } from '@zeiro/core';
import { getPrisma } from '../server';

export const IMPORT_STATUSES = [
  'pending',
  'parsing',
  'preview',
  'importing',
  'complete',
  'failed',
] as const;
export type ImportStatus = (typeof IMPORT_STATUSES)[number];

export type ClientImport = {
  id: string;
  firmId: string;
  actorId: string;
  filename: string;
  mimetype: string | null;
  status: ImportStatus;
  rawRowCount: number | null;
  parsed: ImportPreview | null;
  importedCount: number | null;
  skippedCount: number | null;
  errorCode: string | null;
  errorMessage: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  startedAt: Date | null;
  parsedAt: Date | null;
  completedAt: Date | null;
};

type CreateInput = {
  firmId: string;
  actorId: string;
  filename: string;
  mimetype?: string;
  bytes: Buffer;
};

export async function createClientImport(input: CreateInput): Promise<ClientImport> {
  const row = await getPrisma().clientImport.create({
    data: {
      firmId: input.firmId,
      actorId: input.actorId,
      filename: input.filename,
      mimetype: input.mimetype ?? null,
      bytes: new Uint8Array(input.bytes),
    },
    select: surfaceSelect,
  });
  return shape(row);
}

export async function loadClientImportBytes(
  importId: string,
): Promise<{ row: ClientImport; bytes: Buffer } | null> {
  const row = await getPrisma().clientImport.findUnique({ where: { id: importId } });
  if (!row || !row.bytes) return null;
  return { row: shape(row), bytes: Buffer.from(row.bytes) };
}

export async function claimClientImport(importId: string): Promise<void> {
  await getPrisma().clientImport.update({
    where: { id: importId },
    data: { status: 'parsing', startedAt: new Date() },
  });
}

export async function setClientImportPreview(input: {
  importId: string;
  preview: ImportPreview;
  rawRowCount: number;
}): Promise<void> {
  await getPrisma().clientImport.update({
    where: { id: input.importId },
    data: {
      status: 'preview',
      parsed: input.preview as unknown as Prisma.InputJsonValue,
      rawRowCount: input.rawRowCount,
      parsedAt: new Date(),
      bytes: null,
    },
  });
}

export async function getClientImport(
  firmId: string,
  importId: string,
): Promise<ClientImport | null> {
  const row = await getPrisma().clientImport.findFirst({
    where: { id: importId, firmId },
    select: surfaceSelect,
  });
  return row ? shape(row) : null;
}

export async function listClientImports(firmId: string, limit = 10): Promise<ClientImport[]> {
  const rows = await getPrisma().clientImport.findMany({
    where: { firmId },
    select: surfaceSelect,
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  return rows.map(shape);
}

export async function markClientImportImporting(importId: string): Promise<void> {
  await getPrisma().clientImport.update({
    where: { id: importId },
    data: { status: 'importing' },
  });
}

export async function completeClientImport(input: {
  importId: string;
  importedCount: number;
  skippedCount: number;
}): Promise<void> {
  await getPrisma().clientImport.update({
    where: { id: input.importId },
    data: {
      status: 'complete',
      importedCount: input.importedCount,
      skippedCount: input.skippedCount,
      completedAt: new Date(),
    },
  });
}

export async function failClientImport(input: {
  importId: string;
  errorCode: string;
  errorMessage: string;
}): Promise<void> {
  await getPrisma().clientImport.update({
    where: { id: input.importId },
    data: {
      status: 'failed',
      errorCode: input.errorCode,
      errorMessage: input.errorMessage,
      completedAt: new Date(),
    },
  });
}

const surfaceSelect = {
  id: true,
  firmId: true,
  actorId: true,
  filename: true,
  mimetype: true,
  status: true,
  rawRowCount: true,
  parsed: true,
  importedCount: true,
  skippedCount: true,
  errorCode: true,
  errorMessage: true,
  metadata: true,
  createdAt: true,
  startedAt: true,
  parsedAt: true,
  completedAt: true,
} as const;

type Surface = Omit<ClientImport, 'status' | 'parsed' | 'metadata'> & {
  status: string;
  parsed: Prisma.JsonValue;
  metadata: Prisma.JsonValue;
};

function shape(row: Surface): ClientImport {
  return {
    ...row,
    status: (IMPORT_STATUSES as readonly string[]).includes(row.status)
      ? (row.status as ImportStatus)
      : 'pending',
    parsed:
      row.parsed && typeof row.parsed === 'object' && !Array.isArray(row.parsed)
        ? (row.parsed as unknown as ImportPreview)
        : null,
    metadata:
      row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {},
  };
}
