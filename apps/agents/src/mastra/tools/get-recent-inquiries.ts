import { createTool } from '@mastra/core/tools';
import { TenantIsolationError } from '@zeiro/core/errors';
import { listRecentInquiriesForClient } from '@zeiro/db';
import { z } from 'zod';

const inputSchema = z.object({
  limit: z.number().int().min(1).max(10).default(5),
});

const outputSchema = z.object({
  inquiries: z.array(
    z.object({
      id: z.string(),
      subject: z.string(),
      status: z.string(),
      receivedAt: z.string(),
    }),
  ),
});

export const getRecentInquiriesTool = createTool({
  id: 'get-recent-inquiries',
  description:
    '同じ顧問先の最近の問い合わせ履歴を返す。継続案件の確認や直前の連絡内容を踏まえて返信したい場合に呼ぶ。',
  inputSchema,
  outputSchema,
  execute: async (input, ctx) => {
    const firmId = ctx?.requestContext?.get('firmId');
    const clientId = ctx?.requestContext?.get('clientId');
    if (typeof firmId !== 'string') {
      throw new TenantIsolationError(
        'get-recent-inquiries invoked without firmId in request context',
      );
    }
    if (typeof clientId !== 'string') {
      return { inquiries: [] };
    }
    const rows = await listRecentInquiriesForClient(firmId, clientId, input.limit ?? 5);
    return {
      inquiries: rows.map((r) => ({
        id: r.id,
        subject: r.subject,
        status: r.status,
        receivedAt: r.receivedAt.toISOString(),
      })),
    };
  },
});
