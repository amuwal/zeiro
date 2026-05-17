import { createTool } from '@mastra/core/tools';
import { TenantIsolationError } from '@zeiro/core/errors';
import { getKnowledgeChunksByIds } from '@zeiro/db';
import { z } from 'zod';
import { callDrafterWithCitations } from '../../lib/anthropic-draft';
import { draftPrompt } from '../prompts/draft';
import { assertMutableInquiry } from './state-guard';

const inputSchema = z.object({
  relevantSourceIds: z
    .array(z.string().uuid())
    .min(1)
    .describe('search-knowledge で取得した hits のうち、引用根拠として使う chunk の id 配列'),
  instructionForDrafter: z
    .string()
    .min(1)
    .describe('ドラフター LLM に渡す追加指示 (例: 「期日に必ず触れる」「丁寧な敬語で」)。1〜2 行。'),
});

const outputSchema = z.object({
  kind: z.literal('draft'),
  body: z.string(),
  citations: z.array(z.object({ source: z.string(), citedText: z.string() })),
  blocks: z.array(z.object({ text: z.string(), citationIndexes: z.array(z.number()) })),
  usedSourceIds: z.array(z.string()),
});

// Terminal tool. Wraps Anthropic Citations API around the chunks the agent
// selected. Returns the structured draft (text + per-span citations) for the
// runner to package as a DraftResult. The runner — not this tool — runs the
// reflector pass on the result before returning to the web side.
export const proposeDraftTool = createTool({
  id: 'propose-draft',
  description:
    '取得済みナレッジ chunk を根拠に下書きを生成する終端ツール。relevantSourceIds は search-knowledge で得た hit の id を指定する。',
  inputSchema,
  outputSchema,
  execute: async (input, ctx) => {
    // Refuse before any expensive work (drafter LLM call, KB fetch) if the
    // inquiry is in a state where mutating the draft is meaningless.
    assertMutableInquiry(ctx?.requestContext, 'propose-draft');
    const firmId = ctx?.requestContext?.get('firmId');
    if (typeof firmId !== 'string') {
      throw new TenantIsolationError('propose-draft invoked without firmId in request context');
    }
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY missing');

    const chunks = await getKnowledgeChunksByIds(firmId, input.relevantSourceIds);
    if (chunks.length === 0) {
      // The agent referenced ids that don't resolve in this firm. Fail loud
      // so the agent's next turn can switch to escalate rather than a draft
      // grounded on nothing.
      throw new Error('relevantSourceIds did not match any accessible knowledge chunk');
    }

    const subject = ctx?.requestContext?.get('subject');
    const body = ctx?.requestContext?.get('body');
    const userMessage = `${typeof subject === 'string' ? `件名: ${subject}\n\n` : ''}${
      typeof body === 'string' ? `問い合わせ本文:\n${body}\n\n` : ''
    }下書き作成への追加指示:\n${input.instructionForDrafter}`;

    const drafter = await callDrafterWithCitations({
      apiKey,
      systemPrompt: draftPrompt,
      userMessage,
      documents: chunks.map((c) => ({ source: c.source, content: c.content })),
    });

    return {
      kind: 'draft' as const,
      body: drafter.text,
      citations: drafter.citations.map((c) => ({ source: c.source, citedText: c.citedText })),
      blocks: drafter.blocks,
      usedSourceIds: chunks.map((c) => c.id),
    };
  },
});
