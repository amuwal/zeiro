import type { ClientSearchHit } from '@zeiro/db';

export type TombstoneSearchState =
  | { status: 'idle' }
  | { status: 'results'; query: string; results: ClientSearchHit[] }
  | { status: 'error'; message: string };

export type TombstoneExecuteState =
  | { status: 'idle' }
  | {
      status: 'success';
      clientId: string;
      tombstonedInquiries: number;
      tombstonedDrafts: number;
    }
  | { status: 'error'; message: string };

export const initialSearchState: TombstoneSearchState = { status: 'idle' };
export const initialExecuteState: TombstoneExecuteState = { status: 'idle' };
