import { google } from '@ai-sdk/google';
import { Agent } from '@mastra/core/agent';
import { TRIAGE_MODEL } from '@zeiro/core';
import { reflectorPrompt } from '../prompts/reflector';

// Runs after the drafter (or instead of it, when drafting is skipped). Produces
// the structured AiReview that drives every downstream UI decision — replaces
// the brittle keyword/regex heuristics we used to layer on top of the drafter.
export const reflectorAgent = new Agent({
  id: 'reflector',
  name: 'reflector',
  description: 'AI 下書きをレビューし、推奨アクション・確信度・確認事項を構造化出力で返す',
  model: google(TRIAGE_MODEL),
  instructions: reflectorPrompt,
});
