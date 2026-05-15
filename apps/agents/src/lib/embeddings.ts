import { openai } from '@ai-sdk/openai';
import { EMBEDDING_MODEL } from '@zeiro/core';
import { embed, embedMany } from 'ai';

const model = openai.embedding(EMBEDDING_MODEL);

export async function embedQuery(text: string): Promise<number[]> {
  const { embedding } = await embed({ model, value: text });
  return embedding;
}

export async function embedDocuments(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const { embeddings } = await embedMany({ model, values: texts });
  return embeddings;
}
