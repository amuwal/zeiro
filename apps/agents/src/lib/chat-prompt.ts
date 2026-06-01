import type { ChatInquiryStatus } from '@zeiro/core';

/** Wrap a user chat message with state + chat-mode context so the inquiry
 * agent (whose default prompt forces 1 terminal tool/turn) behaves correctly
 * for free-form dialogue: terminal tools only on explicit intent, never on
 * `sent` inquiries. */
export function buildChatUserMessage(args: {
  status: ChatInquiryStatus;
  hasDraft: boolean;
  userMessage: string;
}): string {
  return [
    '[現在の文脈] チャット対話モード',
    `[現在の状態] ${args.status} (下書き${args.hasDraft ? 'あり' : 'なし'})`,
    STATE_GUIDANCE[args.status],
    '[重要] このターンは対話モードです。終端ツール (propose-draft / escalate / no-reply-needed) はユーザーの明示的な指示があった場合のみ呼んでください。情報的な質問・状況確認には終端ツールを呼ばずにテキストで答えて構いません。',
    '',
    '[ユーザー発言]',
    args.userMessage,
  ].join('\n');
}

const STATE_GUIDANCE: Record<ChatInquiryStatus, string> = {
  pending:
    '[状態ガイド] まだ下書きはありません。ユーザーが下書き作成を求めた場合は propose-draft を呼んでください。',
  drafted:
    '[状態ガイド] 下書きが存在します。ユーザーが修正・再生成を求めた場合は新しい propose-draft を呼ぶと最新版として上書きされます。',
  escalated:
    '[状態ガイド] 所長判断に回されています。ユーザーが下書き再提案を求めた場合は propose-draft を呼ぶと下書き状態に戻ります。',
  rejected:
    '[状態ガイド] 下書きは却下されています。ユーザーが新しい下書きを求めた場合は propose-draft を呼んでください。',
  sent: '[状態ガイド] 既に送信済です。下書き変更系のツール (propose-draft / escalate / no-reply-needed) は呼ばないでください。質問にはテキストで答えるだけにしてください。',
};
