import { processDraft } from '../process-draft';
import { inngest } from './client';

export const draftInquiryFn = inngest.createFunction(
  {
    id: 'draft-inquiry',
    concurrency: { key: 'event.data.firmId', limit: 5 },
    retries: 3,
  },
  { event: 'inquiry.queued' },
  async ({ event, step }) => {
    await step.run('draft', () => processDraft(event.data.firmId, event.data.inquiryId));
    return { ok: true };
  },
);

export const functions = [draftInquiryFn];
