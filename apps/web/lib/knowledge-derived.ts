import type { KnowledgeListItem } from '@zeiro/db';

export type KbStatus = 'fresh' | 'review' | 'outdated';

type Meta = {
  title?: string;
  section?: string;
  updated?: string;
  uses?: number;
  status?: KbStatus;
};

function read(item: KnowledgeListItem): Meta {
  const m = item.metadata;
  return m && typeof m === 'object' && !Array.isArray(m) ? (m as Meta) : {};
}

export function readTitle(item: KnowledgeListItem): string {
  return read(item).title ?? item.source;
}

export function readSection(item: KnowledgeListItem): string | null {
  return read(item).section ?? null;
}

export function readUpdated(item: KnowledgeListItem): string | null {
  return read(item).updated ?? null;
}

export function readUses(item: KnowledgeListItem): number {
  const u = read(item).uses;
  return typeof u === 'number' ? u : 0;
}

export function readStatus(item: KnowledgeListItem): KbStatus {
  return read(item).status ?? 'fresh';
}
