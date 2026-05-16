import { createTool } from '@mastra/core/tools';
import { TenantIsolationError } from '@zeiro/core/errors';
import { getClient } from '@zeiro/db';
import { z } from 'zod';

const inputSchema = z.object({});

const outputSchema = z.object({
  found: z.boolean(),
  name: z.string().nullable(),
  contractType: z.string().nullable(),
  notes: z.string().nullable(),
});

// Pulls the inquiry's client record. The inquiry context (firmId + clientId)
// comes from requestContext — tools never accept tenant IDs as inputs to
// prevent the model from forging cross-tenant reads.
export const getClientTool = createTool({
  id: 'get-client',
  description: '問い合わせ元の顧問先 (client) の基本情報を取得する。名称・契約種別・メモを返す。',
  inputSchema,
  outputSchema,
  execute: async (_input, ctx) => {
    const firmId = ctx?.requestContext?.get('firmId');
    const clientId = ctx?.requestContext?.get('clientId');
    if (typeof firmId !== 'string') {
      throw new TenantIsolationError('get-client invoked without firmId in request context');
    }
    if (typeof clientId !== 'string') {
      return { found: false, name: null, contractType: null, notes: null };
    }
    const client = await getClient(firmId, clientId);
    return {
      found: true,
      name: client.name,
      contractType: client.contractType,
      notes: client.notes,
    };
  },
});
