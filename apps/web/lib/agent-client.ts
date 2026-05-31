import { type DraftResult, draftResultSchema } from '@zeiro/core';
import { FIRM_TOKEN_HEADER, signFirmToken } from '@zeiro/core/security';
import { z } from 'zod';
import { env } from './env';
import { getRequestId, reqLogger } from './request-context';

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
  // The agents service has no Clerk session; it must NOT trust the firmId in the
  // body. Mint a short-lived HMAC token so it can derive (and re-verify) firmId
  // from a signed claim instead. ENCRYPTION_KEY backs the HMAC on both sides.
  const token = signFirmToken({
    firmId: input.firmId,
    ...(input.inquiryId ? { inquiryId: input.inquiryId } : {}),
  });
  const requestId = getRequestId();
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      [FIRM_TOKEN_HEADER]: token,
      ...(requestId ? { 'x-request-id': requestId } : {}),
    },
    body: JSON.stringify({ input }),
  });
  if (!response.ok) {
    // The agents service returns a STABLE error code (e.g. `inquiry_run_failed`)
    // + a requestId on failure — never error.message — so its response body
    // carries no client content. We still must NOT interpolate the raw body into
    // a thrown Error: this error is caught by Inngest and forwarded verbatim to
    // its (off-jp-tokyo) dashboard, and an unexpected non-stable body could echo
    // a header (firm token) or upstream text. Log the status under the
    // PII-scrubbing logger and throw only the status — the requestId already
    // correlates web ↔ agents.
    reqLogger().error(
      { status: response.status, route: 'agents.inquiries.run' },
      'agents service call failed',
    );
    throw new Error(`agents service responded ${response.status}`);
  }
  const json = await response.json();
  const parsed = responseSchema.parse(json);
  return draftResultSchema.parse(parsed.result);
}
