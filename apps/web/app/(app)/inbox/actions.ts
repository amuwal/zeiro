'use server';

import { revalidatePath } from 'next/cache';
import { requireFirmContext } from '@/lib/firm-context';
import { processDraft } from '@/lib/process-draft';

/** Re-run the inquiry pipeline (triage → autonomous agent → persist) for a
 * single inquiry. Triggered from the draft composer's 再生成 button. */
export async function regenerateDraftAction(inquiryId: string): Promise<void> {
  const { firmId } = await requireFirmContext();
  await processDraft(firmId, inquiryId);
  revalidatePath(`/inbox/${inquiryId}`);
}
