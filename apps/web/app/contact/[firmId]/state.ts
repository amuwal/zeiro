export type WebFormState =
  | { status: 'idle' }
  | { status: 'success'; clientCreated: boolean }
  | {
      status: 'error';
      message: string;
      fieldErrors?: Record<string, string[]>;
    };

export const initialWebFormState: WebFormState = { status: 'idle' };
