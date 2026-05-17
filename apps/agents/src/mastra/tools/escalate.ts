import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { assertMutableInquiry } from './state-guard';

const inputSchema = z.object({
  reason: z.string().min(1).describe('所長税理士へ引き継ぐ理由を 1〜2 行で'),
});

const outputSchema = z.object({
  kind: z.literal('escalate'),
  reason: z.string(),
});

// Terminal tool. The runner reads this from the agent's last tool call and
// returns a DraftResult of kind 'escalate' to the web side, which sets the
// inquiry status to 'escalated' and records the audit event.
export const escalateTool = createTool({
  id: 'escalate',
  description: '所長税理士または有資格者の判断が必要な場合に呼ぶ終端ツール。',
  inputSchema,
  outputSchema,
  execute: async (input, ctx) => {
    assertMutableInquiry(ctx?.requestContext, 'escalate');
    return { kind: 'escalate' as const, reason: input.reason };
  },
});
