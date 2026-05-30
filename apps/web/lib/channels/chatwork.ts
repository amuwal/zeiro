import { findClientByChatworkRoomId } from '@zeiro/db';
import {
  type ChatworkConfig,
  chatworkWebhookBodySchema,
  parseChatworkConfig,
} from '@/lib/chatwork/parse';
import { verifyChatworkSignature } from '@/lib/chatwork/verify';
import type { ChannelAdapter } from './contract';

// Chatwork message bodies use bracket markup ([To:..], [rp ..], [qt]..[/qt],
// [info]..[/info], [picon:..]). Strip it so the AI works from clean prose.
function stripChatworkTags(body: string): string {
  return body
    .replace(/\[\/?[^\]]*\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export const chatworkChannelAdapter: ChannelAdapter<ChatworkConfig> = {
  id: 'chatwork',

  parseConfig: parseChatworkConfig,

  verifySignature({ rawBody, headers, config }) {
    return verifyChatworkSignature(
      config.webhookToken,
      rawBody,
      headers.get('x-chatworkwebhooksignature'),
    );
  },

  parseEvents({ rawBody, config }) {
    const parsed = chatworkWebhookBodySchema.safeParse(JSON.parse(rawBody));
    if (!parsed.success) throw new Error('invalid chatwork payload');
    const body = parsed.data;
    if (body.webhook_event_type !== 'message_created') return [];
    const ev = body.webhook_event;
    // Don't ingest messages our own connected account posted (e.g. a sent draft).
    if (config.botAccountId && ev.from_account_id === config.botAccountId) return [];
    const text = stripChatworkTags(ev.body);
    if (!text) return [];
    return [
      {
        senderId: ev.room_id,
        messageId: `chatwork:${ev.room_id}:${ev.message_id}`,
        receivedAt: new Date((ev.send_time ?? 0) * 1000 || Date.now()).toISOString(),
        subject: '',
        body: text,
      },
    ];
  },

  async resolveClient(firmId, msg) {
    const client = await findClientByChatworkRoomId(firmId, msg.senderId);
    return client
      ? { id: client.id, assignedTaxAccountantId: client.assignedTaxAccountantId }
      : null;
  },

  auditMeta(msg) {
    return { roomId: msg.senderId };
  },
};
