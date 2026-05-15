import { z } from 'zod';
import { clientContractTypeSchema } from './client';

// Schema Claude returns for one parsed client. Used to constrain structured
// output and to validate the preview the user reviews.
export const importedClientSchema = z.object({
  name: z.string().min(1).max(120),
  primaryEmail: z.string().email().toLowerCase().nullable(),
  contractType: clientContractTypeSchema.nullable(),
  notes: z.string().max(2000).nullable(),
  // Issues the parser flagged for this row — "ambiguous-name", "no-email", etc.
  // The UI uses them to color rows and group review attention.
  issues: z.array(z.string()).default([]),
  // The row index from the original file, 0-based after header.
  sourceRow: z.number().int().nonnegative(),
});
export type ImportedClient = z.infer<typeof importedClientSchema>;

export const importPreviewSchema = z.object({
  // Headers Claude detected at the top of the sheet — for displaying which
  // columns mapped to which fields.
  detectedColumns: z.object({
    name: z.string().nullable(),
    email: z.string().nullable(),
    contractType: z.string().nullable(),
    notes: z.string().nullable(),
  }),
  // Notes Claude wants the reviewer to see about the file as a whole
  // (multiple sheets found, encoding looked unusual, header was on row 3…).
  fileNotes: z.array(z.string()).default([]),
  rows: z.array(importedClientSchema),
});
export type ImportPreview = z.infer<typeof importPreviewSchema>;
