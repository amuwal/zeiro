import { type DraftResult, draftResultSchema } from '@zeiro/core';
import { z } from 'zod';
import { env } from './env';

export type ThreadMessage = {
  role: 'customer' | 'firm';
  at: string;
  body: string;
};

export type InquiryRunRequest = {
  firmId: string;
  inquiryId?: string;
  clientId?: string | null;
  clientNotes: string | null;
  subject: string;
  body: string;
  threadHistory?: ThreadMessage[];
};

const responseSchema = z.object({
  result: z.unknown(),
});

// Calls the agents service's autonomous inquiry agent (Mastra Agent loop with
// tools: search-knowledge, get-client, get-recent-inquiries, propose-draft,
// escalate, no-reply-needed). Returns the same DraftResult shape as the old
// workflow so the persistence layer doesn't change.
export async function runInquiryPipeline(input: InquiryRunRequest): Promise<DraftResult> {
  const url = `${env.AGENTS_BASE_URL}/api/inquiries/run`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ input }),
  });
  if (!response.ok) {
    throw new Error(`agents service ${response.status}: ${await response.text()}`);
  }
  const json = await response.json();
  const parsed = responseSchema.parse(json);
  return draftResultSchema.parse(parsed.result);
}
