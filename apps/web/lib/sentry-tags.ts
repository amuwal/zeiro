import * as Sentry from '@sentry/nextjs';

// getIsolationScope() is the per-request fork the Sentry async-context strategy
// establishes for each route handler / server action / RSC / Inngest handler, so
// these tags are request-local and never bleed across requests or tenants.
export function setRequestScopeTags(tags: {
  requestId?: string | undefined;
  firmId?: string | undefined;
  userId?: string | undefined;
}): void {
  const scope = Sentry.getIsolationScope();
  if (tags.requestId) scope.setTag('requestId', tags.requestId);
  if (tags.firmId) scope.setTag('firmId', tags.firmId);
  if (tags.userId) scope.setTag('userId', tags.userId);
}
