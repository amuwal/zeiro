export type TeamActionState =
  | { status: 'idle' }
  | { status: 'success'; message: string }
  | { status: 'error'; message: string };

export const initialTeamState: TeamActionState = { status: 'idle' };
