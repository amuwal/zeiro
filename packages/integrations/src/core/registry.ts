import type { ProviderId } from '@zeiro/core';
import type { BaseIntegrationAdapter } from './base-adapter';

const adapters = new Map<ProviderId, BaseIntegrationAdapter>();

export function registerAdapter(adapter: BaseIntegrationAdapter): void {
  adapters.set(adapter.provider, adapter);
}

export function getAdapter(provider: ProviderId): BaseIntegrationAdapter {
  const a = adapters.get(provider);
  if (!a) throw new Error(`no adapter registered for provider: ${provider}`);
  return a;
}

export function hasAdapter(provider: ProviderId): boolean {
  return adapters.has(provider);
}

export function listRegisteredProviders(): ProviderId[] {
  return Array.from(adapters.keys());
}
