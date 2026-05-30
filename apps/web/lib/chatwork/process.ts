import { maskMyNumber } from '@zeiro/core';
import { createInquiry, findClientByChatworkRoomId, recordAudit } from '@zeiro/db';
import { inngest } from '@/lib/inngest/client';
import type { ChatworkWebhookBody } from './parse';

const SYSTEM_ACTOR = '00000000-0000-0000-0000-000000000000';

export type ChatworkProcessOutcome = 'applied' | 'unmatched' | 'skipped';

// Chatwork message bodies use bracket markup ([To:..], [rp ..], [qt]..[/qt],
// [info]..[/info], [picon:..]). Strip it so the AI works from clean prose.
function stripChatworkTags(body: string): string {
  return body
    .replace(/\[\/?[^\]]*\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function processChatworkEvent(
  firmId: string,
  body: ChatworkWebhookBody,
  botAccountId: string,
): Promise<ChatworkProcessOutcome> {
  if (body.webhook_event_type !== 'message_created') return 'skipped';
  const event = body.webhook_event;

  // Don't ingest messages our own connected account posted (e.g. a sent draft).
  if (botAccountId && event.from_account_id === botAccountId) return 'skipped';

  const text = stripChatworkTags(event.body);
  if (!text) return 'skipped';

  const client = await findClientByChatworkRoomId(firmId, event.room_id);
  if (!client) {
    await recordAudit({
      firmId,
      actorId: SYSTEM_ACTOR,
      inquiryId: null,
      action: 'inquiry.received',
      metadata: { unmatched: true, channel: 'chatwork', roomId: event.room_id },
    });
    return 'unmatched';
  }

  const { masked, redactionCount } = maskMyNumber(text);
  const insert = await createInquiry({
    firmId,
    clientId: client.id,
    messageId: `chatwork:${event.room_id}:${event.message_id}`,
    receivedAt: new Date((event.send_time ?? 0) * 1000 || Date.now()).toISOString(),
    subject: '',
    body: masked,
    channel: 'chatwork',
    assignedToId: client.assignedTaxAccountantId,
  });

  await recordAudit({
    firmId,
    actorId: SYSTEM_ACTOR,
    inquiryId: insert.id,
    action: 'inquiry.received',
    metadata: {
      channel: 'chatwork',
      roomId: event.room_id,
      messageId: event.message_id,
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
