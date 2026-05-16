import { anthropic } from '@ai-sdk/anthropic';
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { DRAFT_MODEL } from '@zeiro/core';
import { inquiryAgentPrompt } from '../prompts/inquiry';
import { escalateTool } from '../tools/escalate';
import { getClientTool } from '../tools/get-client';
import { getRecentInquiriesTool } from '../tools/get-recent-inquiries';
import { noReplyNeededTool } from '../tools/no-reply-needed';
import { proposeDraftTool } from '../tools/propose-draft';
import { searchKnowledgeTool } from '../tools/search-knowledge';

// Single autonomous agent that owns the read→reason→decide loop for one
// inquiry. Replaces the hand-rolled triage+draft+reflector pipeline. Memory
// is keyed by inquiry id at call time (see lib/run-inquiry.ts), so each
// inquiry has its own thread that can be resumed later for the chat surface
// in slice 3.
export const inquiryAgent = new Agent({
  id: 'inquiry',
  name: 'inquiry',
  description: '顧問先からの問い合わせを処理し、下書き作成 / エスカレーション / 返信不要を決定する',
  instructions: inquiryAgentPrompt,
  model: anthropic(DRAFT_MODEL),
  tools: {
    searchKnowledge: searchKnowledgeTool,
    getClient: getClientTool,
    getRecentInquiries: getRecentInquiriesTool,
    proposeDraft: proposeDraftTool,
    escalate: escalateTool,
    noReplyNeeded: noReplyNeededTool,
  },
  memory: new Memory({
    options: {
      // 40 mirrors goonsy; keeps a turn's worth of context without unbounded
      // growth. Long-running inquiry threads will compact via Mastra's
      // built-in summariser when this is exceeded.
      lastMessages: 40,
    },
  }),
});
