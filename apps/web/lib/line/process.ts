import { maskMyNumber } from '@zeiro/core';
import { createInquiry, findClientByLineUserId, recordAudit } from '@zeiro/db';
import { inngest } from '@/lib/inngest/client';
import type { LineEvent } from './parse';

const SYSTEM_ACTOR = '00000000-0000-0000-0000-000000000000';

export type LineProcessOutcome = {
  applied: number;
  unmatched: number;
  skipped: number;
};

export async function processLineEvents(
  firmId: string,
  events: LineEvent[],
): Promise<LineProcessOutcome> {
  let applied = 0;
  let unmatched = 0;
  let skipped = 0;

  for (const event of events) {
    const handled = await applyEvent(firmId, event);
    if (handled === 'applied') applied += 1;
    else if (handled === 'unmatched') unmatched += 1;
    else skipped += 1;
  }

  return { applied, unmatched, skipped };
}

async function applyEvent(
  firmId: string,
  event: LineEvent,
): Promise<'applied' | 'unmatched' | 'skipped'> {
  if (event.type !== 'message' || event.message?.type !== 'text' || !event.message.text) {
    return 'skipped';
  }
  const userId = event.source.userId;
  if (!userId) return 'skipped';

  const client = await findClientByLineUserId(firmId, userId);
  if (!client) {
    await recordAudit({
      firmId,
      actorId: SYSTEM_ACTOR,
      inquiryId: null,
      action: 'inquiry.received',
      metadata: { unmatched: true, channel: 'line', lineUserId: userId },
    });
    return 'unmatched';
  }

  const { masked, redactionCount } = maskMyNumber(event.message.text);

  const insert = await createInquiry({
    firmId,
    clientId: client.id,
    messageId: `line:${event.message.id}`,
    receivedAt: new Date(event.timestamp).toISOString(),
    subject: '',
    body: masked,
    channel: 'line',
    assignedToId: client.assignedTaxAccountantId,
  });

  await recordAudit({
    firmId,
    actorId: SYSTEM_ACTOR,
    inquiryId: insert.id,
    action: 'inquiry.received',
    metadata: {
      channel: 'line',
      lineUserId: userId,
      messageId: event.message.id,
      piiRedactions: redactionCount,
    },
  });

  if (insert.kind === 'created') {
    await inngest.send({
      name: 'inquiry.queued',
      data: { firmId, inquiryId: insert.id },
      id: `inquiry-${insert.id}`,
    });
  }
  return 'applied';
}
