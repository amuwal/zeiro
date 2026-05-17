import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { assertMutableInquiry } from './state-guard';

const inputSchema = z.object({
  reason: z.string().min(1).describe('返信不要と判定した理由を 1〜2 行で'),
});

const outputSchema = z.object({
  kind: z.literal('no_draft'),
  reason: z.string(),
});

// Terminal tool. Returned shape uses kind 'no_draft' to align with the
// existing DraftResult schema, so the runner can pass it through unchanged.
export const noReplyNeededTool = createTool({
  id: 'no-reply-needed',
  description: '自動配信メール・誤送信・社内通知など、返信が不要なケースで呼ぶ終端ツール。',
  inputSchema,
  outputSchema,
  execute: async (input, ctx) => {
    assertMutableInquiry(ctx?.requestContext, 'no-reply-needed');
    return { kind: 'no_draft' as const, reason: input.reason };
  },
});
