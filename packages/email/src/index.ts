export { parseSendGridInbound } from './parser';
export { extractAttachments } from './attachments';
export type { ParsedMessage } from './parser';
export {
  buildOutboundThread,
  ensureRePrefix,
  readInquiryReferences,
  type OutboundThread,
} from './threading';
export { sendReply, type SendInput, type SendResult } from './sender';
export { extractEmailText } from './extract';
