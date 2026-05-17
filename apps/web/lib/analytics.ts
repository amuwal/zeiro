import { TARGET_ESCALATION_RATE } from '@zeiro/core';
import { getCategoryDistributionWindow, getDailyBuckets, getWindowKpis } from '@zeiro/db';
import type { WindowResolution } from './analytics-window';

export type CategoryDistribution = { category: string; count: number; pct: number };

export async function getCategoryDistribution(
  firmId: string,
  resolution: WindowResolution,
): Promise<CategoryDistribution[]> {
  const rows = await getCategoryDistributionWindow(
    firmId,
    resolution.current.start,
    resolution.current.end,
  );
  const total = rows.reduce((a, b) => a + b.count, 0) || 1;
  return rows.map((r) => ({
    category: r.category,
    count: r.count,
    pct: Math.round((r.count / total) * 100),
  }));
}

export type KpiSnapshot = {
  total: number; // conversations (chains)
  messages: number; // raw customer messages (rows)
  escalationRate: number;
  adoptionRate: number;
  avgResponseMinutes: number | null;
};

export type WindowKpis = {
  current: KpiSnapshot;
  previous: KpiSnapshot;
  spark: { totals: number[]; sent: number[]; escalated: number[] };
};

export async function getWindowAnalytics(
  firmId: string,
  resolution: WindowResolution,
): Promise<WindowKpis> {
  const [currentRow, previousRow, buckets] = await Promise.all([
    getWindowKpis(firmId, resolution.current.start, resolution.current.end),
    getWindowKpis(firmId, resolution.previous.start, resolution.previous.end),
    getDailyBuckets(firmId, resolution.current.start, resolution.current.end),
  ]);

  return {
    current: toSnapshot(currentRow),
    previous: toSnapshot(previousRow),
    spark: bucketsToSpark(buckets, resolution),
  };
}

function toSnapshot(row: Awaited<ReturnType<typeof getWindowKpis>>): KpiSnapshot {
  const decided = row.draftedInquiries + row.sentInquiries;
  return {
    total: row.totalInquiries, // chain-based — matches inbox
    messages: row.messagesReceived, // row-based — every customer message
    escalationRate: row.totalInquiries === 0 ? 0 : row.escalatedInquiries / row.totalInquiries,
    adoptionRate: decided === 0 ? 0 : row.sentInquiries / decided,
    avgResponseMinutes: row.avgResponseSeconds === null ? null : row.avgResponseSeconds / 60,
  };
}

function bucketsToSpark(
  buckets: Awaited<ReturnType<typeof getDailyBuckets>>,
  resolution: WindowResolution,
): { totals: number[]; sent: number[]; escalated: number[] } {
  const map = new Map(buckets.map((b) => [b.day, b]));
  const totals: number[] = [];
  const sent: number[] = [];
  const escalated: number[] = [];

  const startDay = startOfDay(resolution.current.start);
  for (let i = 0; i < resolution.bucketCount; i++) {
    const day = new Date(startDay.getTime() + i * 24 * 60 * 60 * 1000);
    const key = day.toISOString().slice(0, 10);
    const row = map.get(key);
    totals.push(row?.total ?? 0);
    sent.push(row?.sent ?? 0);
    escalated.push(row?.escalated ?? 0);
  }
  return { totals, sent, escalated };
}

function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

export function pctDelta(current: number, previous: number): { value: number; up: boolean } {
  if (previous === 0) return { value: current === 0 ? 0 : 100, up: current >= previous };
  const value = ((current - previous) / previous) * 100;
  return { value, up: current >= previous };
}

export function formatDeltaPct(delta: { value: number; up: boolean }): string {
  const sign = delta.up ? '+' : '';
  return `${sign}${delta.value.toFixed(1)}%`;
}

export function formatDeltaPoints(currentRate: number, previousRate: number): string {
  const diff = (currentRate - previousRate) * 100;
  const sign = diff >= 0 ? '+' : '';
  return `${sign}${diff.toFixed(1)}pt`;
}

export const TARGET_ESCALATION_PCT = Math.round(TARGET_ESCALATION_RATE * 100);
