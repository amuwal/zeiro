// End-to-end RAG battle test against a real Japanese tax PDF.
//
// 1. Parses the PDF through the same extract→chunk pipeline the ingest action
//    uses, so the test exercises preflight, language detection, and language-
//    aware chunking exactly as production does.
// 2. Embeds the chunks and inserts them into a dedicated test source so the
//    seeded firm doesn't get polluted (clean-up is one DELETE at the end).
// 3. Runs a handful of realistic 税理士 queries through the same `hybridSearch`
//    + Anthropic Citations API path the drafter uses, and prints:
//      - retrieved sources and rerank scores,
//      - the draft answer,
//      - each citation with the cited snippet,
//      - a check that every cited snippet really appears in the source content.
//
// Run from apps/web:
//   pnpm exec tsx scripts/test-large-doc-rag.ts <pdf-path>
//
// The script intentionally avoids the agents HTTP service — it imports the
// drafter and retrieval libs directly so it can run in a single Node process.

import { readFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';

import Anthropic from '@anthropic-ai/sdk';
import { chunkByLanguage, DRAFT_MODEL } from '@zeiro/core';
import {
  deleteGlobalKnowledgeBySource,
  getPrisma,
  insertKnowledgeChunk,
  type KnowledgeHit,
  searchKnowledgeBM25,
  searchKnowledgeVector,
} from '@zeiro/db';
import { config } from 'dotenv';

import { embedDocuments, embedQuery } from '../lib/embeddings';
import { extract } from '../lib/knowledge/extract';

config({ path: '.env.local' });
config({ path: '../../.env.local' });

const FIRM_ID = process.env.RAG_TEST_FIRM_ID ?? 'be11a00c-835f-49d3-8cb4-d9753f2cfcda';
const TEST_SOURCE_PREFIX = 'RAG_TEST / ';

// Synthetic realistic queries a 税理士 might receive. Pick from across the
// document so we can tell whether retrieval is actually working — not just
// returning the first chunk for everything.
const QUERIES = [
  '相続税とはどのような税金ですか?',
  '相続人にはどのような人が含まれますか? 配偶者は相続人になりますか?',
  '相続時精算課税とは何ですか?',
];

async function main() {
  const pdfPath = resolve(process.argv[2] ?? '.test-fixtures/nta-sozoku-faq-2025.pdf');
  log(`▶ target PDF: ${pdfPath}`);

  const buffer = await readFile(pdfPath);
  const source = `${TEST_SOURCE_PREFIX}${basename(pdfPath)}`;

  // 1. Parse + chunk through the production pipeline.
  log('\n— stage 1: extract + chunk —');
  const t0 = performance.now();
  const extracted = await extract({ buffer, filename: basename(pdfPath) });
  const tExtract = (performance.now() - t0) / 1000;
  log(
    `  kind=${extracted.kind} pages=${extracted.pages ?? '—'} chars=${extracted.text.length} lang=${extracted.detectedLanguage}`,
  );
  log(`  warnings=${extracted.warnings.join(',') || '—'}  (${tExtract.toFixed(1)}s)`);

  const chunks = chunkByLanguage(extracted.text, extracted.detectedLanguage);
  log(`  → ${chunks.length} chunks (avg ${avgLen(chunks).toFixed(0)} chars)`);

  // 2. Embed and insert into the test source.
  log('\n— stage 2: embed + ingest —');
  const existing = await checkExisting(source);
  if (existing > 0) {
    log(`  source already has ${existing} chunks — clearing for a clean run`);
    await deleteGlobalKnowledgeBySource(source);
    // Note: this only clears global chunks. For the firm-scoped chunks we
    // wrote in a prior run, use the explicit cleanup below.
    await cleanupTestSource(source);
  }

  const t1 = performance.now();
  const embeddings = await embedDocuments(chunks.map((c) => c.text));
  const tEmbed = (performance.now() - t1) / 1000;
  log(`  embedded ${embeddings.length} chunks in ${tEmbed.toFixed(1)}s`);

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const emb = embeddings[i];
    if (!chunk || !emb) continue;
    await insertKnowledgeChunk({
      firmId: FIRM_ID,
      source,
      content: chunk.text,
      embedding: emb,
      metadata: {
        documentId: 'rag-test-doc',
        chunkIdx: i,
        ingestedAt: new Date().toISOString(),
        language: extracted.detectedLanguage,
        extractionKind: extracted.kind,
        ragTest: true,
      },
    });
  }
  log(`  inserted ${chunks.length} chunks under source="${source}"`);

  // 3. Run queries through the same retrieval the drafter uses, then Claude
  //    Citations API. Reports retrieved hits, the draft text, and citation
  //    fidelity (does the cited_text literally appear in the source content?).
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY missing');
  const anthropic = new Anthropic({ apiKey });

  for (const query of QUERIES) {
    log(`\n— query — ${query}`);
    const t2 = performance.now();
    const embedding = await embedQuery(query);
    const [vec, lex] = await Promise.all([
      searchKnowledgeVector(FIRM_ID, embedding, 20),
      searchKnowledgeBM25(FIRM_ID, query, 20),
    ]);
    const fused = rrfFuse(vec, lex).slice(0, 5);
    const tRetrieve = (performance.now() - t2) / 1000;
    log(`  retrieved ${fused.length} hits in ${tRetrieve.toFixed(2)}s:`);
    for (let i = 0; i < fused.length; i++) {
      const h = fused[i];
      if (!h) continue;
      log(`    [${i + 1}] (sim=${h.similarity.toFixed(3)}) ${h.source}`);
      log(`        ${preview(h.content, 110)}`);
    }

    const t3 = performance.now();
    const response = await anthropic.messages.create({
      model: DRAFT_MODEL,
      max_tokens: 1024,
      system:
        'あなたは税理士事務所のアシスタントです。提供された documents の内容のみを根拠に、顧問先からの質問に丁寧に回答してください。documents に無い情報は推測せず、「弊所担当者よりご連絡します」と明記してください。',
      messages: [
        {
          role: 'user',
          content: [
            ...fused.map((h) => ({
              type: 'document' as const,
              source: {
                type: 'content' as const,
                content: [{ type: 'text' as const, text: h.content }],
              },
              title: h.source,
              citations: { enabled: true },
            })),
            { type: 'text' as const, text: query },
          ],
        },
      ],
    });
    const tDraft = (performance.now() - t3) / 1000;

    // Collect text + citations like the production drafter does.
    let draftText = '';
    const citationFidelity: { snippet: string; sourceIdx: number; verbatim: boolean }[] = [];
    for (const block of response.content) {
      if (block.type !== 'text') continue;
      draftText += block.text;
      const blockCites = (block as { citations?: unknown[] }).citations;
      if (!Array.isArray(blockCites)) continue;
      for (const c of blockCites) {
        const cite = c as { document_index?: number; cited_text?: string };
        const idx = typeof cite.document_index === 'number' ? cite.document_index : -1;
        const snippet = typeof cite.cited_text === 'string' ? cite.cited_text : '';
        const doc = fused[idx];
        const verbatim = doc !== undefined && doc.content.includes(snippet);
        citationFidelity.push({ snippet, sourceIdx: idx, verbatim });
      }
    }

    log(
      `\n  draft (${tDraft.toFixed(1)}s, ${response.usage.input_tokens}→${response.usage.output_tokens} tok):`,
    );
    log(indent(draftText, '    '));

    log(`\n  citations: ${citationFidelity.length}`);
    let verbatim = 0;
    for (const c of citationFidelity) {
      if (c.verbatim) verbatim += 1;
      const tag = c.verbatim ? '✅' : '⚠️ ';
      log(`    ${tag} [${c.sourceIdx + 1}] ${preview(c.snippet, 120)}`);
    }
    log(`  fidelity: ${verbatim}/${citationFidelity.length} verbatim`);
  }

  // 4. Clean up.
  log('\n— cleanup —');
  const removed = await cleanupTestSource(source);
  log(`  removed ${removed} test chunks`);
  await getPrisma().$disconnect();
}

async function checkExisting(source: string): Promise<number> {
  const rows = await getPrisma().$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count FROM knowledge_chunks WHERE source = ${source}
  `;
  return Number(rows[0]?.count ?? 0);
}

async function cleanupTestSource(source: string): Promise<number> {
  const result = await getPrisma().knowledgeChunk.deleteMany({
    where: { source },
  });
  return result.count;
}

// Reciprocal Rank Fusion — same constants as the production retrieval module.
function rrfFuse(vec: KnowledgeHit[], lex: KnowledgeHit[]): KnowledgeHit[] {
  const k = 60;
  const scores = new Map<string, number>();
  const byId = new Map<string, KnowledgeHit>();
  for (const ranking of [vec, lex]) {
    ranking.forEach((hit, rank) => {
      scores.set(hit.id, (scores.get(hit.id) ?? 0) + 1 / (k + rank + 1));
      byId.set(hit.id, hit);
    });
  }
  return Array.from(scores.entries())
    .map(([id, score]) => {
      const hit = byId.get(id);
      return hit ? { ...hit, similarity: score } : null;
    })
    .filter((h): h is KnowledgeHit => Boolean(h))
    .sort((a, b) => b.similarity - a.similarity);
}

function avgLen(chunks: { text: string }[]): number {
  if (chunks.length === 0) return 0;
  return chunks.reduce((s, c) => s + c.text.length, 0) / chunks.length;
}

function preview(text: string, max: number): string {
  const oneLine = text.replace(/\s+/g, ' ').trim();
  return oneLine.length <= max ? oneLine : `${oneLine.slice(0, max)}…`;
}

function indent(text: string, prefix: string): string {
  return text
    .split('\n')
    .map((line) => prefix + line)
    .join('\n');
}

function log(s: string): void {
  process.stdout.write(`${s}\n`);
}

main().catch((e) => {
  process.stderr.write(`${(e as Error).stack ?? (e as Error).message}\n`);
  process.exit(1);
});
