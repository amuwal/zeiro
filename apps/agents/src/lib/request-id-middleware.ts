import * as Sentry from '@sentry/node';
import type { MiddlewareHandler } from 'hono';
import { getAgentContext, runWithAgentContext } from './request-context';

export const REQUEST_ID_HEADER = 'x-request-id';

// Binds the inbound x-request-id (threaded from web) to a correlated agents
// logger for the lifetime of the request, and echoes it back on the response so
// the id is visible end-to-end. firmId is bound later (bindAgentFirm) once the
// signed token is verified in the handler.
export const requestIdMiddleware: MiddlewareHandler = (c, next) => {
  const incoming = c.req.header(REQUEST_ID_HEADER);
  return runWithAgentContext({ requestId: incoming ?? null }, async () => {
    const ctx = getAgentContext();
    if (ctx) {
      c.header(REQUEST_ID_HEADER, ctx.requestId);
      Sentry.getIsolationScope().setTag('requestId', ctx.requestId);
    }
    await next();
  });
};
