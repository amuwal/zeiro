/** Read the inquiry's current lifecycle status from the agent's request
 * context (populated by the chat endpoint). The pipeline doesn't set this —
 * pipeline only runs on fresh inquiries so omission is treated as a permissive
 * default. */
export type ContextLike =
  | {
      get(key: string): unknown;
    }
  | null
  | undefined;

export function readCurrentStatus(ctx: ContextLike): string | null {
  const v = ctx?.get('currentStatus');
  return typeof v === 'string' ? v : null;
}

/** Throws if a draft-mutating terminal tool (propose-draft / escalate /
 * no-reply-needed) is invoked on an inquiry that has already been sent. The
 * error message is surfaced to the agent as a tool-error chunk so it can
 * apologise to the user instead of pretending the mutation happened. */
export function assertMutableInquiry(ctx: ContextLike, toolName: string): void {
  const status = readCurrentStatus(ctx);
  if (status === 'sent') {
    throw new Error(
      `${toolName}: cannot mutate this inquiry — its reply was already sent. Tell the user the conversation is closed; if they need a new follow-up, a new inquiry should be created.`,
    );
  }
}
