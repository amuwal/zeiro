import { google } from '@ai-sdk/google';
import { Agent } from '@mastra/core/agent';
import { TRIAGE_MODEL } from '@zeiro/core';
import { triagePrompt } from '../prompts/triage';

export const triageAgent = new Agent({
  name: 'triage',
  description: '受信メールを5カテゴリに分類し、緊急度と信頼度スコアを返す',
  model: google(TRIAGE_MODEL),
  instructions: triagePrompt,
});
