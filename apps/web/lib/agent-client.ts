import { type DraftResult, draftResultSchema } from '@zeiro/core';
import { z } from 'zod';
import { env } from './env';

export type PipelineRequest = {
  firmId: string;
  clientNotes: string | null;
  subject: string;
  body: string;
};

const responseSchema = z.object({
  result: z.unknown(),
});

export async function runInquiryPipeline(input: PipelineRequest): Promise<DraftResult> {
  const url = `${env.AGENTS_BASE_URL}/api/workflows/inquiry-pipeline/start-async`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ inputData: input }),
  });
  if (!response.ok) {
    throw new Error(`agents service ${response.status}: ${await response.text()}`);
  }
  const json = await response.json();
  const parsed = responseSchema.parse(json);
  return draftResultSchema.parse(parsed.result);
}
