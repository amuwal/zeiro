import { z } from 'zod';

export const firmSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  inboundAddress: z.string().email(),
  region: z.string(),
  settings: z.record(z.string(), z.unknown()),
  createdAt: z.string().datetime(),
});
export type Firm = z.infer<typeof firmSchema>;

export const clientSchema = z.object({
  id: z.string().uuid(),
  firmId: z.string().uuid(),
  name: z.string(),
  primaryEmail: z.string().email(),
  contractType: z.string(),
  assignedTaxAccountantId: z.string().uuid().nullable(),
  notes: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()),
});
export type Client = z.infer<typeof clientSchema>;
