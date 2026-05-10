'use server';

import { recordAudit, setInquiryStatus } from '@zeiro/db';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireFirmContext } from '@/lib/firm-context';

export async function rejectUnmatchedAction(formData: FormData): Promise<void> {
  const { firmId, userId } = await requireFirmContext();
  const inquiryId = readString(formData, 'inquiryId');
  const fromAddress = readString(formData, 'fromAddress');
  const subject = readString(formData, 'subject');

  await setInquiryStatus(firmId, inquiryId, 'rejected');
  await recordAudit({
    firmId,
    actorId: userId,
    inquiryId,
    action: 'inquiry.discarded',
    metadata: { fromAddress, subject, reason: 'unmatched_sender_rejected' },
  });

  revalidatePath('/inbox');
  redirect('/inbox?filter=unmatched');
}

function readString(formData: FormData, key: string): string {
  const v = formData.get(key);
  if (typeof v !== 'string') throw new Error(`missing ${key}`);
  return v;
}
