import { randomUUID } from 'node:crypto';
import { maskMyNumber, type WebFormSubmission, webFormSubmissionSchema } from '@zeiro/core';
import {
  createInquiry,
  findOrCreateClientByEmail,
  getFirm,
  getFirmChannel,
  recordAudit,
} from '@zeiro/db';
import { inngest } from '../inngest/client';
import { rateLimit } from './rate-limit';

const SYSTEM_ACTOR = '00000000-0000-0000-0000-000000000000';

export type WebFormError =
  | { kind: 'firm_not_found' }
  | { kind: 'channel_disabled' }
  | { kind: 'rate_limited'; resetIn: number }
  | { kind: 'invalid'; fieldErrors: Record<string, string[]> };

export type WebFormResult =
  | { ok: true; inquiryId: string; clientCreated: boolean }
  | { ok: false; error: WebFormError };

type ProcessInput = {
  firmId: string;
  ip: string;
  raw: Record<string, unknown>;
};

export async function processWebInquiry(input: ProcessInput): Promise<WebFormResult> {
  const firm = await getFirm(input.firmId).catch(() => null);
  if (!firm) return { ok: false, error: { kind: 'firm_not_found' } };

  const channel = await getFirmChannel(firm.id, 'web');
  if (!channel?.enabled) return { ok: false, error: { kind: 'channel_disabled' } };

  const limit = rateLimit(`web:${firm.id}:${input.ip}`);
  if (!limit.allowed) {
    return { ok: false, error: { kind: 'rate_limited', resetIn: limit.resetIn } };
  }

  const parsed = webFormSubmissionSchema.safeParse(input.raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: { kind: 'invalid', fieldErrors: parsed.error.flatten().fieldErrors },
    };
  }

  return persist(firm.id, parsed.data, input.ip);
}

async function persist(
  firmId: string,
  submission: WebFormSubmission,
  ip: string,
): Promise<WebFormResult> {
  const { client, created: clientCreated } = await findOrCreateClientByEmail(
    firmId,
    submission.email,
    submission.name,
  );

  const { masked: maskedBody, redactionCount } = maskMyNumber(submission.body);
  const messageId = `web:${randomUUID()}`;
  const receivedAt = new Date().toISOString();

  const insert = await createInquiry({
    firmId,
    clientId: client.id,
    messageId,
    receivedAt,
    subject: submission.subject,
    body: maskedBody,
    channel: 'web',
    assignedToId: client.assignedTaxAccountantId,
  });

  await recordAudit({
    firmId,
    actorId: SYSTEM_ACTOR,
    inquiryId: insert.id,
    action: 'inquiry.received',
    metadata: {
      channel: 'web',
      via: 'web_form',
      submittedEmail: submission.email,
      submittedName: submission.name,
      clientCreated,
      ip,
      piiRedactions: redactionCount,
      messageId,
    },
  });

  if (insert.kind === 'created') {
    await inngest.send({
      name: 'inquiry.queued',
      data: { firmId, inquiryId: insert.id },
      id: `inquiry-${insert.id}`,
    });
  }

  return { ok: true, inquiryId: insert.id, clientCreated };
}
