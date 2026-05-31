import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import { child, type Logger } from '@zeiro/core/logger';
import { setRequestScopeTags } from './sentry-tags';

export type WebRequestContext = {
  requestId: string;
  firmId?: string;
  userId?: string;
  logger: Logger;
};

// node:async_hooks + node:crypto are Node-only — this module is imported ONLY
// from route handlers / server actions / lib code that run in the Node runtime,
// never from middleware or client components (which would break the Edge build).
const storage = new AsyncLocalStorage<WebRequestContext>();

export function newRequestId(): string {
  return randomUUID();
}

// Run `fn` inside a fresh correlation scope. `requestId` is minted at the
// inbound boundary (webhook / server action) and threaded onward via Inngest
// events and the x-request-id header to the agents service.
export function runWithRequestContext<T>(
  init: {
    requestId?: string | undefined;
    firmId?: string | undefined;
    userId?: string | undefined;
  },
  fn: () => T,
): T {
  const requestId = init.requestId ?? newRequestId();
  const ctx: WebRequestContext = {
    requestId,
    ...(init.firmId ? { firmId: init.firmId } : {}),
    ...(init.userId ? { userId: init.userId } : {}),
    logger: child({
      requestId,
      ...(init.firmId ? { firmId: init.firmId } : {}),
      ...(init.userId ? { userId: init.userId } : {}),
    }),
  };
  setRequestScopeTags({ requestId, firmId: init.firmId, userId: init.userId });
  return storage.run(ctx, fn);
}

export function getRequestContext(): WebRequestContext | undefined {
  return storage.getStore();
}

export function getRequestId(): string | undefined {
  return storage.getStore()?.requestId;
}

// Ambient request-scoped logger when one exists, else a fresh correlated child
// so a log call never throws for lack of a surrounding scope.
export function reqLogger(): Logger {
  const store = storage.getStore();
  if (store) return store.logger;
  return child({ requestId: newRequestId() });
}

// Bind firmId/userId onto the active scope once auth resolves them, so all
// downstream logs in the same request carry tenant + actor correlation.
export function bindRequestScope(bind: {
  firmId?: string | undefined;
  userId?: string | undefined;
}): void {
  const store = storage.getStore();
  if (!store) return;
  if (bind.firmId) store.firmId = bind.firmId;
  if (bind.userId) store.userId = bind.userId;
  setRequestScopeTags({ firmId: bind.firmId, userId: bind.userId });
  store.logger = child({
    requestId: store.requestId,
    ...(store.firmId ? { firmId: store.firmId } : {}),
    ...(store.userId ? { userId: store.userId } : {}),
  });
}
