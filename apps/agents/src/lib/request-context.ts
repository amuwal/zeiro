import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import * as Sentry from '@sentry/node';
import { child, type Logger } from '@zeiro/core/logger';

export type AgentRequestContext = {
  requestId: string;
  firmId?: string;
  logger: Logger;
};

const storage = new AsyncLocalStorage<AgentRequestContext>();

// Accepts the requestId threaded from web via the x-request-id header so one
// user request is one searchable id end-to-end; mints a fresh one if absent
// (direct call / health check).
export function runWithAgentContext<T>(
  init: { requestId?: string | null; firmId?: string },
  fn: () => T,
): T {
  const requestId = init.requestId && init.requestId.length > 0 ? init.requestId : randomUUID();
  const ctx: AgentRequestContext = {
    requestId,
    ...(init.firmId ? { firmId: init.firmId } : {}),
    logger: child({ requestId, ...(init.firmId ? { firmId: init.firmId } : {}) }),
  };
  return storage.run(ctx, fn);
}

export function getAgentContext(): AgentRequestContext | undefined {
  return storage.getStore();
}

export function bindAgentFirm(firmId: string): void {
  const store = storage.getStore();
  if (!store) return;
  store.firmId = firmId;
  store.logger = child({ requestId: store.requestId, firmId });
  Sentry.getIsolationScope().setTag('firmId', firmId);
}

export function agentLogger(): Logger {
  const store = storage.getStore();
  if (store) return store.logger;
  return child({ requestId: randomUUID() });
}
