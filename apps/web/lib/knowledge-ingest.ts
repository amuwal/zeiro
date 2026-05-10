import { EMBEDDING_MODEL, chunkJapanese } from '@zeiro/core';
import { insertKnowledgeChunk } from '@zeiro/db';
import { extractEmailText } from '@zeiro/email';
import { embedDocuments } from './embeddings';

export type IngestInput = {
  firmId: string;
  source: string;
  documentId: string;
  body: string;
  isEmail?: boolean;
};

export type IngestResult = {
  chunks: number;
};

export async function ingestKnowledge(input: IngestInput): Promise<IngestResult> {
  const text = input.isEmail ? await extractEmailText(input.body) : input.body;
  const chunks = chunkJapanese(text);
  if (chunks.length === 0) return { chunks: 0 };

  const embeddings = await embedDocuments(chunks.map((c) => c.text));

  const ingestedAt = new Date().toISOString();
  for (let i = 0; i < chunks.length; i++) {
    await insertKnowledgeChunk({
      firmId: input.firmId,
      source: input.source,
      content: chunks[i].text,
      embedding: embeddings[i],
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
