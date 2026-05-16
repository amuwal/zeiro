import type { BaseIntegrationAdapter } from './base-adapter';

const adapters = new Map<string, BaseIntegrationAdapter>();

export function registerAdapter(adapter: BaseIntegrationAdapter): void {
  adapters.set(adapter.provider, adapter);
}

export function getAdapter(provider: string): BaseIntegrationAdapter {
  const a = adapters.get(provider);
  if (!a) throw new Error(`no adapter registered for provider: ${provider}`);
  return a;
}

export function listRegisteredProviders(): string[] {
  return Array.from(adapters.keys());
}
