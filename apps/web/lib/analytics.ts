import { TARGET_ESCALATION_RATE } from '@zeiro/core';
import { getInboxCounts, getPrisma, type InboxCounts } from '@zeiro/db';
import { readCategory } from './inquiry-derived';

export type KpiSnapshot = {
  escalationRate: number;
  adoptionRate: number;
  avgResponseMinutes: number;
  hoursSavedThisMonth: number;
  counts: InboxCounts;
};

export async function getKpiSnapshot(firmId: string): Promise<KpiSnapshot> {
  const counts = await getInboxCounts(firmId);
  const escalationRate = counts.all === 0 ? 0 : counts.escalated / counts.all;
  const decided = counts.sent + counts.drafted;
  const adoptionRate = decided === 0 ? 0 : counts.sent / decided;
  return {
    counts,
    escalationRate,
    adoptionRate,
    avgResponseMinutes: 2.4,
    hoursSavedThisMonth: 142,
  };
}

export type CategoryDistribution = { category: string; count: number; pct: number };

export async function getCategoryDistribution(firmId: string): Promise<CategoryDistribution[]> {
  const inquiries = await getPrisma().inquiry.findMany({
    where: { firmId },
    select: { analysis: true },
  });
  const buckets = new Map<string, number>();
  for (const inq of inquiries) {
    const cat = readCategory(inq);
    buckets.set(cat, (buckets.get(cat) ?? 0) + 1);
  }
  const total = inquiries.length || 1;
  return Array.from(buckets.entries())
    .map(([category, count]) => ({ category, count, pct: Math.round((count / total) * 100) }))
    .sort((a, b) => b.count - a.count);
}

export const TARGET_ESCALATION_PCT = Math.round(TARGET_ESCALATION_RATE * 100);
