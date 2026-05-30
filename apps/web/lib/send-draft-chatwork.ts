import {
  getDraftByInquiry,
  getFirmChannel,
  getInquiry,
  patchDraftMetadata,
  recordAudit,
  setInquiryStatus,
} from '@zeiro/db';
import { parseChatworkConfig } from './chatwork/parse';
import { postChatworkMessage } from './chatwork/post';
import { inngest } from './inngest/client';
import type { SendDraftArgs } from './send-draft';

// Posts an approved draft back to the originating Chatwork room. The room id is
// recovered from the inquiry's messageId (`chatwork:<roomId>:<messageId>`), so a
// reply always lands in the same room the question came from. Mirrors the email
// path's post-send bookkeeping (status, audit, compounding-knowledge loop).
export async function sendDraftChatwork(args: SendDraftArgs): Promise<void> {
  const [inquiry, draft, channel] = await Promise.all([
    getInquiry(args.firmId, args.inquiryId),
    getDraftByInquiry(args.firmId, args.inquiryId),
    getFirmChannel(args.firmId, 'chatwork'),
  ]);
  if (!inquiry) throw new Error(`inquiry ${args.inquiryId} not found`);
  if (!draft) throw new Error(`no draft for inquiry ${args.inquiryId}`);
  const config = parseChatworkConfig(channel?.config);
  if (!channel?.enabled || !config) {
    throw new Error('cannot send reply: Chatwork channel not configured');
  }
  const roomId = inquiry.messageId.split(':')[1];
  if (!roomId) throw new Error('cannot resolve Chatwork room from inquiry');

  const bodyToSend = args.editedBody ?? draft.body;
  const wasEdited = args.editedBody !== null && args.editedBody !== draft.body;
  const messageId = await postChatworkMessage(config.apiToken, roomId, bodyToSend);

  await patchDraftMetadata(args.firmId, draft.id, {
    sentAt: new Date().toISOString(),
    channel: 'chatwork',
    outboundMessageId: messageId ? `chatwork:${roomId}:${messageId}` : null,
  });
  await setInquiryStatus(args.firmId, args.inquiryId, 'sent');
  await recordAudit({
    firmId: args.firmId,
    actorId: args.userId,
    inquiryId: args.inquiryId,
    action: 'draft.sent',
    metadata: {
      channel: 'chatwork',
      roomId,
      chatworkMessageId: messageId,
      edited: wasEdited,
      ...(wasEdited ? { sentBody: bodyToSend, sentLength: bodyToSend.length } : {}),
    },
  });

  await inngest.send({
    name: 'knowledge.auto_add',
    data: { firmId: args.firmId, inquiryId: args.inquiryId, draftId: draft.id },
    id: `auto-add-${draft.id}`,
  });
}
