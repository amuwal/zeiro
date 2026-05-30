import { findClientByLineUserId } from '@zeiro/db';
import { type LineConfig, lineWebhookBodySchema, parseLineConfig } from '@/lib/line/parse';
import { verifyLineSignature } from '@/lib/line/verify';
import type { ChannelAdapter } from './contract';

// LINE as a ChannelAdapter. The text-only / message-only skip rules that used to
// live in processLineEvents now live in parseEvents — everything regulated runs
// in the shared processInbound.
export const lineChannelAdapter: ChannelAdapter<LineConfig> = {
  id: 'line',

  parseConfig: parseLineConfig,

  verifySignature({ rawBody, headers, config }) {
    return verifyLineSignature(config.channelSecret, rawBody, headers.get('x-line-signature'));
  },

  parseEvents({ rawBody }) {
    const parsed = lineWebhookBodySchema.safeParse(JSON.parse(rawBody));
    if (!parsed.success) throw new Error('invalid line payload');
    const out = [];
    for (const ev of parsed.data.events) {
      if (ev.type !== 'message' || ev.message?.type !== 'text' || !ev.message.text) continue;
      const userId = ev.source.userId;
      if (!userId) continue;
      out.push({
        senderId: userId,
        messageId: `line:${ev.message.id}`,
        receivedAt: new Date(ev.timestamp).toISOString(),
        subject: '',
        body: ev.message.text,
      });
    }
    return out;
  },

  async resolveClient(firmId, msg) {
    const client = await findClientByLineUserId(firmId, msg.senderId);
    return client
      ? { id: client.id, assignedTaxAccountantId: client.assignedTaxAccountantId }
      : null;
  },

  auditMeta(msg) {
    return { lineUserId: msg.senderId };
  },
};
