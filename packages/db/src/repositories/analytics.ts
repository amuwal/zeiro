import { getPrisma } from '../server';

export type WindowKpiRow = {
  totalInquiries: number;
  escalatedInquiries: number;
  draftedInquiries: number;
  sentInquiries: number;
  avgResponseSeconds: number | null;
};

export async function getWindowKpis(firmId: string, start: Date, end: Date): Promise<WindowKpiRow> {
  const rows = await getPrisma().$queryRaw<
    {
      total: bigint;
      escalated: bigint;
      drafted: bigint;
      sent: bigint;
      avg_response_seconds: number | null;
    }[]
  >`
    SELECT
      COUNT(*)::bigint AS total,
      COUNT(*) FILTER (WHERE status = 'escalated')::bigint AS escalated,
      COUNT(*) FILTER (WHERE status = 'drafted')::bigint AS drafted,
      COUNT(*) FILTER (WHERE status = 'sent')::bigint AS sent,
      AVG(
        EXTRACT(EPOCH FROM (
          (SELECT MIN(d.created_at) FROM drafts d WHERE d.inquiry_id = i.id) - i.received_at
        ))
      ) FILTER (WHERE status IN ('drafted', 'sent')) AS avg_response_seconds
    FROM inquiries i
    WHERE firm_id = ${firmId}::uuid
      AND received_at >= ${start}
      AND received_at < ${end}
  `;
  const row = rows[0];
  if (!row) {
    return {
      totalInquiries: 0,
      escalatedInquiries: 0,
      draftedInquiries: 0,
      sentInquiries: 0,
      avgResponseSeconds: null,
    };
  }
  return {
    totalInquiries: Number(row.total),
    escalatedInquiries: Number(row.escalated),
    draftedInquiries: Number(row.drafted),
    sentInquiries: Number(row.sent),
    avgResponseSeconds: row.avg_response_seconds,
  };
}

export type DailyBucket = { day: string; total: number; sent: number; escalated: number };

export async function getDailyBuckets(
  firmId: string,
  start: Date,
  end: Date,
): Promise<DailyBucket[]> {
  return getPrisma().$queryRaw<DailyBucket[]>`
    SELECT
      to_char(date_trunc('day', received_at), 'YYYY-MM-DD') AS day,
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'sent')::int AS sent,
      COUNT(*) FILTER (WHERE status = 'escalated')::int AS escalated
    FROM inquiries
    WHERE firm_id = ${firmId}::uuid
      AND received_at >= ${start}
      AND received_at < ${end}
    GROUP BY 1
    ORDER BY 1 ASC
  `;
}

export type CategoryDistributionRow = { category: string; count: number };

export async function getCategoryDistributionWindow(
  firmId: string,
  start: Date,
  end: Date,
): Promise<CategoryDistributionRow[]> {
  return getPrisma().$queryRaw<CategoryDistributionRow[]>`
    SELECT
      COALESCE(NULLIF(analysis->>'category', ''), 'その他') AS category,
      COUNT(*)::int AS count
    FROM inquiries
    WHERE firm_id = ${firmId}::uuid
      AND received_at >= ${start}
      AND received_at < ${end}
    GROUP BY 1
    ORDER BY count DESC
  `;
}
