import { chunkByLanguage, EMBEDDING_MODEL } from '@zeiro/core';
import { insertKnowledgeChunk } from '@zeiro/db';
import { embedDocuments } from './embeddings';

export type IngestInput = {
  firmId: string;
  source: string;
  documentId: string;
  body: string;
  language?: string;
  extractionKind?: string;
  extractionWarnings?: string[];
  extractionMeta?: Record<string, unknown>;
};

export type IngestResult = {
  chunks: number;
};

export async function ingestKnowledge(input: IngestInput): Promise<IngestResult> {
  const chunks = chunkByLanguage(input.body, input.language);
  if (chunks.length === 0) return { chunks: 0 };

  const embeddings = await embedDocuments(chunks.map((c) => c.text));

  const ingestedAt = new Date().toISOString();
  // If extraction emitted warnings (tables dropped, images dropped, OCR
  // escalation), surface them on every chunk so the review UI can flag the
  // source as needing a human pass before it's trusted for drafting.
  const requiresReview = (input.extractionWarnings?.length ?? 0) > 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const embedding = embeddings[i];
    if (!chunk || !embedding) continue;
    await insertKnowledgeChunk({
      firmId: input.firmId,
      source: input.source,
      content: chunk.text,
      embedding,
      metadata: {
        documentId: input.documentId,
        documentVersion: '1',
        chunkIdx: i,
        embeddingModel: EMBEDDING_MODEL,
        requiresReview,
        ...(requiresReview ? { reviewReason: warningReason(input.extractionWarnings) } : {}),
        status: 'fresh',
        ingestedAt,
        ...(input.language ? { language: input.language } : {}),
        ...(input.extractionKind ? { extractionKind: input.extractionKind } : {}),
        ...(input.extractionWarnings && input.extractionWarnings.length > 0
          ? { extractionWarnings: input.extractionWarnings }
          : {}),
        ...(input.extractionMeta ? { extractionMeta: input.extractionMeta } : {}),
      },
    });
  }
  return { chunks: chunks.length };
}

function warningReason(warnings: string[] | undefined): string {
  if (!warnings || warnings.length === 0) return '抽出に注意点があります';
  const labels: Record<string, string> = {
    'tables-dropped': '表の構造が一部失われています',
    'images-dropped': '図表が抽出されていません',
    'mixed-languages': '複数言語が混在しています',
    'low-text-density': 'スキャン画像から OCR で抽出しました',
    'short-output': '抽出結果が短いです',
    'partial-pages': '一部ページの抽出に失敗しました',
  };
  return warnings.map((w) => labels[w] ?? w).join(' / ');
}
