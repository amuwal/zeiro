import { z } from 'zod';

export const CLIENT_CONTRACT_TYPES = ['monthly', 'spot', 'prospect', 'unverified'] as const;
export const clientContractTypeSchema = z.enum(CLIENT_CONTRACT_TYPES);
export type ClientContractType = z.infer<typeof clientContractTypeSchema>;

export const CLIENT_SOURCES = [
  'manual',
  'web_form',
  'email_promotion',
  'line',
  'seeded',
  'csv',
  'api',
] as const;
export const clientSourceSchema = z.enum(CLIENT_SOURCES);
export type ClientSource = z.infer<typeof clientSourceSchema>;

// Tax-relevant client context the drafting agent needs to answer the bulk of
// real inquiries (期日確認 needs 決算月; 顧問契約 needs 顧問料/契約範囲; 税務質問 is
// framed by 課税区分/インボイス登録). Stored in client.metadata.profile (loose DB,
// tight Zod). Every field optional — a firm fills what it knows.
export const ENTITY_TYPES = ['corporation', 'sole_proprietor'] as const;
export const entityTypeSchema = z.enum(ENTITY_TYPES);
export type EntityType = z.infer<typeof entityTypeSchema>;

export const CONSUMPTION_TAX_STATUSES = ['taxable', 'simplified', 'exempt'] as const;
export const consumptionTaxStatusSchema = z.enum(CONSUMPTION_TAX_STATUSES);
export type ConsumptionTaxStatus = z.infer<typeof consumptionTaxStatusSchema>;

export const clientProfileSchema = z.object({
  fiscalMonth: z.number().int().min(1).max(12).optional(), // 決算月
  entityType: entityTypeSchema.optional(), // 法人 / 個人事業主
  consumptionTax: consumptionTaxStatusSchema.optional(), // 消費税: 課税 / 簡易 / 免税
  invoiceRegistered: z.boolean().optional(), // インボイス登録事業者
  withholding: z.boolean().optional(), // 源泉徴収義務 (給与支払事業所)
  monthlyFee: z.number().int().min(0).optional(), // 顧問料 (月額・円)
  engagementScope: z.string().max(500).optional(), // 契約範囲 (記帳代行・申告のみ 等)
});
export type ClientProfile = z.infer<typeof clientProfileSchema>;

export const clientMetadataSchema = z.object({
  source: clientSourceSchema.optional(),
  createdBy: z.string().uuid().nullable().optional(),
  createdAt: z.string().datetime().optional(),
  archivedAt: z.string().datetime().nullable().optional(),
  archivedBy: z.string().uuid().nullable().optional(),
  profile: clientProfileSchema.optional(),
});
export type ClientMetadata = z.infer<typeof clientMetadataSchema>;

export const clientCreateInputSchema = z.object({
  name: z.string().min(1, '名前を入力してください').max(120),
  primaryEmail: z.string().email('正しいメールアドレスを入力してください').toLowerCase(),
  contractType: clientContractTypeSchema,
  assignedTaxAccountantId: z.string().uuid().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  source: clientSourceSchema.default('manual'),
});
export type ClientCreateInput = z.infer<typeof clientCreateInputSchema>;

export const clientUpdateInputSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  contractType: clientContractTypeSchema.optional(),
  assignedTaxAccountantId: z.string().uuid().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});
export type ClientUpdateInput = z.infer<typeof clientUpdateInputSchema>;
