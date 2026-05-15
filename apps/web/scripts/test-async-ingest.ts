// Verifies the async ingestion path end-to-end. Skips the HTTP layer because
// auth + multipart uploads from a CLI are noisy; instead it does exactly what
// the server action does:
//
//   1. Preflight the bytes
//   2. createIngestionJob() — writes the row with status=pending
//   3. inngest.send() — fires the event the Inngest dev server picks up
//
// Then polls the job row until it reaches a terminal state and prints the
// full lifecycle. The Inngest dev server must be running for the worker to
// pick up the event.

import { readFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { createIngestionJob, getPrisma, type IngestionJob } from '@zeiro/db';
import { config } from 'dotenv';

import { inngest } from '../lib/inngest/client';
import { preflight } from '../lib/knowledge/preflight';
import { ParserError } from '../lib/knowledge/types';

config({ path: '.env.local' });

const FIRM_ID = process.env.RAG_TEST_FIRM_ID ?? 'be11a00c-835f-49d3-8cb4-d9753f2cfcda';
const ACTOR_ID = '00000000-0000-0000-0000-000000000000';

async function main() {
  const pdfPath = resolve(process.argv[2] ?? '.test-fixtures/nta-sozoku-content.pdf');
  log(`▶ uploading: ${pdfPath}`);

  const buffer = await readFile(pdfPath);
  log(`  size: ${(buffer.length / 1024).toFixed(0)} KB`);

  try {
    const pre = await preflight({ buffer, filename: basename(pdfPath) });
    log(`  preflight: ✅ ${pre.canonical}`);
  } catch (e) {
    if (e instanceof ParserError) {
      log(`  preflight: ❌ ${e.code}: ${e.message}`);
      return;
    }
    throw e;
  }

  const job = await createIngestionJob({
    firmId: FIRM_ID,
    actorId: ACTOR_ID,
    source: `ASYNC_TEST / ${basename(pdfPath)}`,
    filename: basename(pdfPath),
    mimetype: 'application/pdf',
    bytes: buffer,
    metadata: { sizeBytes: buffer.length, viaScript: true },
  });
  log(`  job created: ${job.id}  status=${job.status}`);

  await inngest.send({
    name: 'knowledge.user_uploaded',
    data: { jobId: job.id, firmId: FIRM_ID, actorId: ACTOR_ID },
  });
  log('  event sent — watching for status changes…');

  const started = performance.now();
  let lastStatus = job.status;
  let lastReport = 0;
  while (true) {
    await sleep(500);
    const current = await fetchJob(job.id);
    if (!current) {
      log('  ⚠️  job vanished');
      break;
    }
    if (current.status !== lastStatus || performance.now() - lastReport > 5000) {
      const elapsed = ((performance.now() - started) / 1000).toFixed(1);
      log(
        `  [${elapsed}s] status=${current.status}${current.chunkCount != null ? ` chunks=${current.chunkCount}` : ''}`,
      );
      lastStatus = current.status;
      lastReport = performance.now();
    }
    if (current.status === 'complete' || current.status === 'failed') {
      log(
        current.status === 'complete'
          ? `  ✅ done — ${current.chunkCount} chunks ingested`
          : `  ❌ failed — ${current.errorCode}: ${current.errorMessage}`,
      );
      log(`  total elapsed: ${((performance.now() - started) / 1000).toFixed(1)}s`);
      break;
    }
    if (performance.now() - started > 120_000) {
      log('  ⚠️  timeout (120s) — is the inngest dev server running?');
      break;
    }
  }

  // Clean up the inserted chunks so re-runs are repeatable.
  if (lastStatus === 'complete') {
    const removed = await getPrisma().knowledgeChunk.deleteMany({
      where: { source: `ASYNC_TEST / ${basename(pdfPath)}` },
    });
    log(`  cleaned up ${removed.count} chunks`);
  }
  await getPrisma()
    .knowledgeIngestionJob.delete({ where: { id: job.id } })
    .catch(() => {});
  await getPrisma().$disconnect();
}

async function fetchJob(id: string): Promise<IngestionJob | null> {
  const row = await getPrisma().knowledgeIngestionJob.findUnique({
    where: { id },
  });
  if (!row) return null;
  return {
    id: row.id,
    firmId: row.firmId,
    actorId: row.actorId,
    source: row.source,
    filename: row.filename,
    mimetype: row.mimetype,
    status: row.status as IngestionJob['status'],
    chunkCount: row.chunkCount,
    errorCode: row.errorCode,
    errorMessage: row.errorMessage,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    createdAt: row.createdAt,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function log(s: string): void {
  process.stdout.write(`${s}\n`);
}

main().catch((e) => {
  process.stderr.write(`${(e as Error).stack ?? (e as Error).message}\n`);
  process.exit(1);
});
