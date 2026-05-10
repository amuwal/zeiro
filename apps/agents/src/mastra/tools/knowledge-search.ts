import { createTool } from '@mastra/core/tools';
import { TenantIsolationError } from '@zeiro/core/errors';
import { z } from 'zod';
import { hybridSearch } from '../../lib/retrieval';

const inputSchema = z.object({
  query: z.string().min(1),
  topK: z.number().int().min(1).max(20).default(5),
});

const outputSchema = z.object({
  hits: z.array(
    z.object({
      id: z.string(),
      content: z.string(),
      source: z.string(),
      similarity: z.number(),
    }),
  ),
});

export const knowledgeSearchTool = createTool({
  id: 'knowledge-search',
  description:
    '事務所のナレッジベース（過去メール・FAQ・マニュアル）をハイブリッド検索（ベクトル+BM25→RRF→Cohere Rerank）',
  inputSchema,
  outputSchema,
  execute: async (input, ctx) => {
    const firmId = ctx.requestContext?.get('firmId');
    if (typeof firmId !== 'string') {
      throw new TenantIsolationError('knowledge-search invoked without firmId in request context');
    }
    const opts = input.topK !== undefined ? { topN: input.topK } : {};
    const hits = await hybridSearch(firmId, input.query, opts);
    return { hits };
  },
});
