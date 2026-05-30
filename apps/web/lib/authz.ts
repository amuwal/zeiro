import { type Action, type Actor, can, ForbiddenError } from '@zeiro/core';
import { type FirmContext, requireFirmContext } from './firm-context';

export function actorOf(ctx: FirmContext): Actor {
  return { role: ctx.role, canSend: ctx.canSend };
}

export function ctxCan(ctx: FirmContext, action: Action): boolean {
  return can(actorOf(ctx), action);
}

// Visibility scope for repository queries. `seeAll` true → no client filter;
// otherwise the user only sees the inquiries/clients they are assigned to
// (§54 need-to-know default for staff/viewer).
export type ViewerScope = { userId: string; seeAll: boolean };

export function viewerScope(ctx: FirmContext): ViewerScope {
  return { userId: ctx.userId, seeAll: ctx.clientScope === 'all' };
}

// Loads the firm context and asserts the action in one call, for server actions
// and route handlers. Returns the context so callers can use firmId/userId.
// Throws ForbiddenError when denied — UI also hides the affordance, this is the
// server-side backstop.
export async function requireCan(action: Action): Promise<FirmContext> {
  const ctx = await requireFirmContext();
  if (!can(actorOf(ctx), action)) throw new ForbiddenError(action);
  return ctx;
}
