// The OAuth data-integration providers Zeiro can bind a 顧問先 to. Single source
// of truth for the registry keys, binding `provider` args, and audit metadata.
// DB columns stay loose strings (per CLAUDE.md loose-DB/tight-Zod); this union is
// the application-boundary guarantee that a provider id is real.
export const PROVIDER_IDS = ['freee', 'moneyforward', 'chatwork'] as const;

export type ProviderId = (typeof PROVIDER_IDS)[number];

export function isProviderId(value: string): value is ProviderId {
  return (PROVIDER_IDS as readonly string[]).includes(value);
}
