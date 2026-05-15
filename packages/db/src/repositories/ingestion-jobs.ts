import type { Prisma } from '@prisma/client';
import { getPrisma } from '../server';

// Distinct lifecycle states. Application code reads these as a tagged union
// rather than free-form strings — keep in sync with the JobStatus type below.
export const JOB_STATUSES = ['pending', 'processing', 'complete', 'failed'] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

// Surface shape returned to the UI: never includes the raw `bytes` column,
// which can be tens of MB. The worker reads bytes separately via the load
// function below.
export type IngestionJob = {
  id: string;
  firmId: string;
  actorId: string;
  source: string;
  filename: string;
  mimetype: string | null;
  status: JobStatus;
  chunkCount: number | null;
  errorCode: string | null;
  errorMessage: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
};

type CreateInput = {
  firmId: string;
  actorId: string;
  source: string;
  filename: string;
  mimetype?: string;
  bytes: Buffer;
  metadata?: Record<string, unknown>;
};

export async function createIngestionJob(input: CreateInput): Promise<IngestionJob> {
  // Prisma's `Bytes` column wants a `Uint8Array<ArrayBuffer>`, not Node's
  // `Buffer` (whose backing buffer is `ArrayBufferLike`). Copy into a fresh
  // typed array so TS is happy and the row owns its own bytes.
  const bytes = new Uint8Array(input.bytes);
  const row = await getPrisma().knowledgeIngestionJob.create({
    data: {
      firmId: input.firmId,
      actorId: input.actorId,
      source: input.source,
      filename: input.filename,
      mimetype: input.mimetype ?? null,
      bytes,
      metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
    },
    select: surfaceSelect,
  });
  return shape(row);
}

// Loads the bytes for the worker. Returns null when the job has already been
// processed (and bytes nulled out) so the caller can short-circuit on retry.
export async function loadIngestionJobBytes(
  jobId: string,
): Promise<{ job: IngestionJob; bytes: Buffer } | null> {
  const row = await getPrisma().knowledgeIngestionJob.findUnique({
    where: { id: jobId },
  });
  if (!row || !row.bytes) return null;
  return {
    job: shape(row),
    bytes: Buffer.from(row.bytes),
  };
}

// Two-step claim → complete keeps the status column honest in the UI: a job
// stuck in `processing` (worker crashed mid-run) is visible as a hung job
// rather than appearing to be still pending.
export async function claimIngestionJob(jobId: string): Promise<void> {
  await getPrisma().knowledgeIngestionJob.update({
    where: { id: jobId },
    data: { status: 'processing', startedAt: new Date() },
  });
}

export async function completeIngestionJob(input: {
  jobId: string;
  chunkCount: number;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await getPrisma().knowledgeIngestionJob.update({
    where: { id: input.jobId },
    data: {
      status: 'complete',
      completedAt: new Date(),
      chunkCount: input.chunkCount,
      // Free up the bytes column on success — the file is now represented by
      // the chunks in `knowledge_chunks` and we don't need to keep a second
      // copy on the job row.
      bytes: null,
      ...(input.metadata ? { metadata: input.metadata as Prisma.InputJsonValue } : {}),
    },
  });
}

export async function failIngestionJob(input: {
  jobId: string;
  errorCode: string;
  errorMessage: string;
}): Promise<void> {
  await getPrisma().knowledgeIngestionJob.update({
    where: { id: input.jobId },
    data: {
      status: 'failed',
      completedAt: new Date(),
      errorCode: input.errorCode,
      errorMessage: input.errorMessage,
      // Keep bytes around on failure so the user can retry without re-uploading.
    },
  });
}

// All jobs for the firm, newest first. Used by the UI to show in-progress
// and recently-completed jobs alongside the firm-document grid.
export async function listIngestionJobs(firmId: string, limit = 20): Promise<IngestionJob[]> {
  const rows = await getPrisma().knowledgeIngestionJob.findMany({
    where: { firmId },
    select: surfaceSelect,
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  return rows.map(shape);
}

export async function listActiveIngestionJobs(firmId: string): Promise<IngestionJob[]> {
  const rows = await getPrisma().knowledgeIngestionJob.findMany({
    where: { firmId, status: { in: ['pending', 'processing'] } },
    select: surfaceSelect,
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(shape);
}

const surfaceSelect = {
  id: true,
  firmId: true,
  actorId: true,
  source: true,
  filename: true,
  mimetype: true,
  status: true,
  chunkCount: true,
  errorCode: true,
  errorMessage: true,
  metadata: true,
  createdAt: true,
  startedAt: true,
  completedAt: true,
} as const;

type Surface = Omit<IngestionJob, 'metadata' | 'status'> & {
  metadata: Prisma.JsonValue;
  status: string;
};

function shape(row: Surface): IngestionJob {
  return {
    ...row,
    status: (JOB_STATUSES as readonly string[]).includes(row.status)
      ? (row.status as JobStatus)
      : 'pending',
    metadata:
      row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {},
  };
}
