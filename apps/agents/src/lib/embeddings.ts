import { openai } from '@ai-sdk/openai';
import { EMBEDDING_MODEL } from '@zeiro/core';
import { embed } from 'ai';

const model = openai.embedding(EMBEDDING_MODEL);

export async function embedQuery(text: string): Promise<number[]> {
  const { embedding } = await embed({ model, value: text });
  return embedding;
}
