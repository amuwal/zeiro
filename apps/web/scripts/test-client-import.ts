// CLI end-to-end probe for the bulk-client-import path. Skips the HTTP layer
// because multipart uploads from a CLI are noisy; instead it does what the
// upload action does:
//
//   1. Read the file
//   2. createClientImport(...) → status=pending row + bytes
//   3. inngest.send('clients.import_uploaded', ...)
//
// Then polls until the import row hits a terminal/preview state and prints
// the parsed preview the user would see in the browser. Optionally confirms
// the import (writes rows into `clients`) and cleans up.

import { readFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';

import {
  type ClientImport,
  completeClientImport,
  createClient,
  createClientImport,
  getClientImport,
  getPrisma,
  listClientEmails,
  markClientImportImporting,
} from '@zeiro/db';
import { config } from 'dotenv';

import { inngest } from '../lib/inngest/client';

config({ path: '.env.local' });

const FIRM_ID = process.env.RAG_TEST_FIRM_ID ?? 'be11a00c-835f-49d3-8cb4-d9753f2cfcda';
const ACTOR_ID = '00000000-0000-0000-0000-000000000000';
const CONFIRM = process.argv.includes('--confirm');

async function main() {
  const filepath = resolve(process.argv[2] ?? '.test-fixtures/messy-koumonsaki.csv');
  log(`▶ uploading: ${filepath}`);
  const buffer = await readFile(filepath);
  log(`  size: ${(buffer.length / 1024).toFixed(1)} KB`);

  const importRow = await createClientImport({
    firmId: FIRM_ID,
    actorId: ACTOR_ID,
    filename: basename(filepath),
    mimetype: filepath.endsWith('.csv')
      ? 'text/csv'
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    bytes: buffer,
  });
  log(`  import created: ${importRow.id}  status=${importRow.status}`);

  await inngest.send({
    name: 'clients.import_uploaded',
    data: { importId: importRow.id, firmId: FIRM_ID, actorId: ACTOR_ID },
  });
  log('  event sent — watching for parse to complete…');

  const started = performance.now();
  let last = importRow.status;
  let final: ClientImport | null = null;
  while (true) {
    await sleep(500);
    const current = await getClientImport(FIRM_ID, importRow.id);
    if (!current) {
      log('  ⚠️  import vanished');
      return;
    }
    if (current.status !== last) {
      const elapsed = ((performance.now() - started) / 1000).toFixed(1);
      log(`  [${elapsed}s] status=${current.status}`);
      last = current.status;
    }
    if (
      current.status === 'preview' ||
      current.status === 'failed' ||
      current.status === 'complete'
    ) {
      final = current;
      break;
    }
    if (performance.now() - started > 60_000) {
      log('  ⚠️  timeout (60s)');
      return;
    }
  }

  if (!final || final.status === 'failed') {
    log(`  ❌ ${final?.errorCode ?? 'unknown'}: ${final?.errorMessage ?? '—'}`);
    return;
  }
  if (!final.parsed) {
    log('  ❌ no preview attached');
    return;
  }

  const preview = final.parsed;
  log('\n— parsed preview —');
  log(
    `  detected columns: name=${preview.detectedColumns.name ?? '—'}  email=${preview.detectedColumns.email ?? '—'}  contract=${preview.detectedColumns.contractType ?? '—'}  notes=${preview.detectedColumns.notes ?? '—'}`,
  );
  if (preview.fileNotes.length > 0) {
    log('  file notes:');
    for (const note of preview.fileNotes) log(`    · ${note}`);
  }
  log(`  rows: ${preview.rows.length}`);
  for (const r of preview.rows) {
    const issues = r.issues.length > 0 ? ` [${r.issues.join(',')}]` : '';
    log(
      `    [${r.sourceRow}] ${r.name}  <${r.primaryEmail ?? '—'}>  ${r.contractType ?? '—'}  notes="${r.notes ?? ''}"${issues}`,
    );
  }

  if (!CONFIRM) {
    log('\n  (run with --confirm to insert the parsed rows; cleaning up the import row)');
    await getPrisma().clientImport.delete({ where: { id: importRow.id } });
    await getPrisma().$disconnect();
    return;
  }

  log('\n— confirming import (writing to clients) —');
  await markClientImportImporting(FIRM_ID, importRow.id);
  const existingEmails = await listClientEmails(FIRM_ID);
  let imported = 0;
  let skipped = 0;
  for (const r of preview.rows) {
    if (!r.primaryEmail || !r.name.trim()) {
      skipped += 1;
      continue;
    }
    if (existingEmails.has(r.primaryEmail.toLowerCase())) {
      skipped += 1;
      continue;
    }
    const result = await createClient(FIRM_ID, {
      name: r.name,
      primaryEmail: r.primaryEmail,
      contractType: r.contractType ?? 'unverified',
      assignedTaxAccountantId: null,
      notes: r.notes,
      source: 'csv',
      createdBy: ACTOR_ID,
    });
    if (result.ok) {
      imported += 1;
      existingEmails.add(r.primaryEmail.toLowerCase());
    } else {
      skipped += 1;
    }
  }
  await completeClientImport({
    firmId: FIRM_ID,
    importId: importRow.id,
    importedCount: imported,
    skippedCount: skipped,
  });
  log(`  ✅ imported=${imported}  skipped=${skipped}`);
  await getPrisma().$disconnect();
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
