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

export const clientMetadataSchema = z.object({
  source: clientSourceSchema.optional(),
  createdBy: z.string().uuid().nullable().optional(),
  createdAt: z.string().datetime().optional(),
  archivedAt: z.string().datetime().nullable().optional(),
  archivedBy: z.string().uuid().nullable().optional(),
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
