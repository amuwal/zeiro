export type ClientFormState =
  | { status: 'idle' }
  | { status: 'success'; clientId: string }
  | { status: 'error'; message: string; fieldErrors?: Record<string, string> };

export const initialClientFormState: ClientFormState = { status: 'idle' };

export type DeleteClientState = { status: 'idle' } | { status: 'error'; message: string };

export const initialDeleteClientState: DeleteClientState = { status: 'idle' };
