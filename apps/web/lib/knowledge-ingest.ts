import { chunkJapanese, EMBEDDING_MODEL } from '@zeiro/core';
import { insertKnowledgeChunk } from '@zeiro/db';
import { embedDocuments } from './embeddings';

export type IngestInput = {
  firmId: string;
  source: string;
  documentId: string;
  body: string;
};

export type IngestResult = {
  chunks: number;
};

export async function ingestKnowledge(input: IngestInput): Promise<IngestResult> {
  const chunks = chunkJapanese(input.body);
  if (chunks.length === 0) return { chunks: 0 };

  const embeddings = await embedDocuments(chunks.map((c) => c.text));

  const ingestedAt = new Date().toISOString();
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
        requiresReview: false,
        status: 'fresh',
        ingestedAt,
      },
    });
  }
  return { chunks: chunks.length };
}
