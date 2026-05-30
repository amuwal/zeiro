import { createTool } from '@mastra/core/tools';
import { clientMetadataSchema } from '@zeiro/core';
import { TenantIsolationError } from '@zeiro/core/errors';
import { getClient } from '@zeiro/db';
import { z } from 'zod';

const inputSchema = z.object({});

const profileSchema = z.object({
  fiscalMonth: z.number().nullable(), // 決算月
  entityType: z.string().nullable(), // 法人 / 個人事業主
  consumptionTax: z.string().nullable(), // 課税 / 簡易 / 免税
  invoiceRegistered: z.boolean().nullable(),
  withholding: z.boolean().nullable(),
  monthlyFee: z.number().nullable(),
  engagementScope: z.string().nullable(),
});

const outputSchema = z.object({
  found: z.boolean(),
  name: z.string().nullable(),
  contractType: z.string().nullable(),
  notes: z.string().nullable(),
  profile: profileSchema.nullable(),
});

// Pulls the inquiry's client record. The inquiry context (firmId + clientId)
// comes from requestContext — tools never accept tenant IDs as inputs to
// prevent the model from forging cross-tenant reads.
export const getClientTool = createTool({
  id: 'get-client',
  description:
    '問い合わせ元の顧問先 (client) の情報を取得する。名称・契約種別・メモに加え、決算月・法人/個人区分・消費税区分・インボイス登録・源泉徴収義務・顧問料(月額)・契約範囲を返す。期日や料金、適用される税務手続きの判断に使う。',
  inputSchema,
  outputSchema,
  execute: async (_input, ctx) => {
    const firmId = ctx?.requestContext?.get('firmId');
    const clientId = ctx?.requestContext?.get('clientId');
    if (typeof firmId !== 'string') {
      throw new TenantIsolationError('get-client invoked without firmId in request context');
    }
    if (typeof clientId !== 'string') {
      return { found: false, name: null, contractType: null, notes: null, profile: null };
    }
    const client = await getClient(firmId, clientId);
    const meta = clientMetadataSchema.safeParse(client.metadata);
    const p = meta.success ? meta.data.profile : undefined;
    return {
      found: true,
      name: client.name,
      contractType: client.contractType,
      notes: client.notes,
      profile: p
        ? {
            fiscalMonth: p.fiscalMonth ?? null,
            entityType: p.entityType ?? null,
            consumptionTax: p.consumptionTax ?? null,
            invoiceRegistered: p.invoiceRegistered ?? null,
            withholding: p.withholding ?? null,
            monthlyFee: p.monthlyFee ?? null,
            engagementScope: p.engagementScope ?? null,
          }
        : null,
    };
  },
});
