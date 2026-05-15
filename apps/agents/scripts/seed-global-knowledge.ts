import '../src/lib/env-loader';
import { EMBEDDING_MODEL } from '@zeiro/core';
import {
  deleteGlobalKnowledgeBySource,
  insertGlobalKnowledgeChunk,
  JP_TAX_FAQ,
  PACK_ID,
  PACK_VERSION,
} from '@zeiro/db';
import { embedDocuments } from '../src/lib/embeddings';

async function main() {
  const sources = JP_TAX_FAQ.map((entry) => entry.source);
  const contents = JP_TAX_FAQ.map((entry) => entry.content);

  log(`embedding ${contents.length} entries with ${EMBEDDING_MODEL}`);
  const embeddings = await embedDocuments(contents);

  if (embeddings.length !== contents.length) {
    throw new Error(`embedding count mismatch: ${embeddings.length} vs ${contents.length}`);
  }

  log('clearing prior global rows for this pack');
  let removed = 0;
  for (const source of sources) {
    removed += await deleteGlobalKnowledgeBySource(source);
  }
  log(`  removed ${removed} prior rows`);

  log('inserting fresh rows');
  const ingestedAt = new Date().toISOString();
  for (let i = 0; i < JP_TAX_FAQ.length; i++) {
    const entry = JP_TAX_FAQ[i];
    const embedding = embeddings[i];
    if (!entry || !embedding) continue;
    await insertGlobalKnowledgeChunk({
      source: entry.source,
      content: entry.content,
      embedding,
      metadata: {
        pack: PACK_ID,
        packVersion: PACK_VERSION,
        category: entry.category,
        embeddingModel: EMBEDDING_MODEL,
        requiresReview: false,
        status: 'fresh',
        ingestedAt,
      },
    });
  }
  log(`done — inserted ${JP_TAX_FAQ.length} entries for pack ${PACK_ID}@${PACK_VERSION}`);
}

function log(msg: string): void {
  process.stdout.write(`[seed-global-knowledge] ${msg}\n`);
}

main().catch((e) => {
  process.stderr.write(`${e instanceof Error ? (e.stack ?? e.message) : String(e)}\n`);
  process.exit(1);
});
