import { maskMyNumber, SYSTEM_ACTOR_ID as SYSTEM_ACTOR } from '@zeiro/core';
import { createInquiry, recordAudit } from '@zeiro/db';
import { inngest } from '@/lib/inngest/client';
import { getRequestId } from '@/lib/request-context';
import type { CanonicalMessage, ChannelAdapter } from './contract';

export type InboundOutcome = { applied: number; unmatched: number; skipped: number };

// The ONE copy of the regulated inbound steps for webhook channels. Every
// channel's PII masking, audit trail, and idempotency go through here, so they
// can never silently drift apart between channels (§5.1 / §38). The adapter
// supplies only the channel-specific bits: how to resolve a client and what
// extra audit fields to record.
export async function processInbound(
  firmId: string,
  adapter: Pick<ChannelAdapter<unknown>, 'id' | 'resolveClient' | 'auditMeta'>,
  msgs: CanonicalMessage[],
): Promise<InboundOutcome> {
  let applied = 0;
  let unmatched = 0;
  for (const msg of msgs) {
    const client = await adapter.resolveClient(firmId, msg);
    if (!client) {
      await recordAudit({
        firmId,
        actorId: SYSTEM_ACTOR,
        inquiryId: null,
        action: 'inquiry.received',
        metadata: { unmatched: true, channel: adapter.id, ...adapter.auditMeta(msg) },
      });
      unmatched += 1;
      continue;
    }

    const { masked, redactionCount } = maskMyNumber(msg.body);
    const insert = await createInquiry({
      firmId,
      clientId: client.id,
      messageId: msg.messageId,
      receivedAt: msg.receivedAt,
      subject: msg.subject,
      body: masked,
      channel: adapter.id,
      assignedToId: client.assignedTaxAccountantId,
    });

    await recordAudit({
      firmId,
      actorId: SYSTEM_ACTOR,
      inquiryId: insert.id,
      action: 'inquiry.received',
      metadata: { channel: adapter.id, piiRedactions: redactionCount, ...adapter.auditMeta(msg) },
    });

    // Gate on 'created' so a re-delivered webhook (same messageId → 'duplicate')
    // never double-enqueues the pipeline.
    if (insert.kind === 'created') {
      const requestId = getRequestId();
      await inngest.send({
        name: 'inquiry.queued',
        data: { firmId, inquiryId: insert.id, ...(requestId ? { requestId } : {}) },
        id: `inquiry-${insert.id}`,
      });
    }
    applied += 1;
  }
  return { applied, unmatched, skipped: 0 };
}
