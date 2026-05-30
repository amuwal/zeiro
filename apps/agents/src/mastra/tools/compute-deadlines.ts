import { createTool } from '@mastra/core/tools';
import { clientMetadataSchema, computeTaxDeadlines } from '@zeiro/core';
import { TenantIsolationError } from '@zeiro/core/errors';
import { getClient } from '@zeiro/db';
import { z } from 'zod';

const outputSchema = z.object({
  hasProfile: z.boolean(),
  deadlines: z.array(
    z.object({
      label: z.string(),
      date: z.string().nullable(),
      daysUntil: z.number().nullable(),
      basis: z.string(),
    }),
  ),
  note: z.string(),
});

// Derives the client's principle (原則) tax deadlines from its 決算月 / 事業形態 /
// 課税区分 — so 期日確認 inquiries get a grounded date instead of an escalation.
// Always labelled as 原則; the agent must defer 延長特例・中間申告・土日順延 to the 税理士.
export const computeDeadlinesTool = createTool({
  id: 'compute-deadlines',
  description:
    '顧問先の決算月・事業形態・課税区分から、申告・納付などの主要な期日(原則)を算出する。期日確認の問い合わせで呼ぶ。決算月等が未設定なら hasProfile:false を返すので、その場合は推測せず担当者への確認を促すこと。算出値はあくまで原則であり、延長特例・中間申告・土日祝日順延などの個別事情は税理士が確認する必要がある旨を下書きに明記すること。',
  inputSchema: z.object({}),
  outputSchema,
  execute: async (_input, ctx) => {
    const firmId = ctx?.requestContext?.get('firmId');
    const clientId = ctx?.requestContext?.get('clientId');
    if (typeof firmId !== 'string') {
      throw new TenantIsolationError('compute-deadlines invoked without firmId in request context');
    }
    if (typeof clientId !== 'string') {
      return {
        hasProfile: false,
        deadlines: [],
        note: '顧問先が紐付いていないため期日を算出できません。',
      };
    }
    const client = await getClient(firmId, clientId);
    const meta = clientMetadataSchema.safeParse(client.metadata);
    const profile = meta.success ? meta.data.profile : undefined;
    const usable =
      profile &&
      (profile.entityType === 'sole_proprietor' || typeof profile.fiscalMonth === 'number');
    if (!profile || !usable) {
      return {
        hasProfile: false,
        deadlines: [],
        note: '決算月・事業形態が未設定のため期日を算出できません。担当者に確認してください。',
      };
    }
    // JST calendar date — deadlines are calendar dates, so anchor to JST.
    const today = new Date(Date.now() + 9 * 60 * 60 * 1000);
    return {
      hasProfile: true,
      deadlines: computeTaxDeadlines(profile, today),
      note: 'いずれも原則の期日です。延長特例・中間申告・土日祝日順延などの個別事情は税理士が確認してください。',
    };
  },
});
