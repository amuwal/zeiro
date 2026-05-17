import { getPrisma } from '../server';

// Conversation-vs-message semantics.
//
// Inquiries are stored append-only — each customer message is its own row,
// linked via parent_inquiry_id. The dashboard "inbox" surfaces ONE row per
// conversation (the leaf — the inquiry no one else points back at). We mirror
// that semantic in analytics so the numbers reconcile:
//
//   - conversation-level (chains)  → "how many topics are we handling"
//       totalInquiries, escalatedInquiries, draftedInquiries, sentInquiries,
//       category distribution, daily-bucket totals
//
//   - message-level (rows)         → "how often does the AI replace effort"
//       avgResponseSeconds, draftsGenerated, draftsSent (per-draft adoption)
//
// The `LEAF` CTE below is defined once and re-used. Leaf = inquiry with no
// child via parent_inquiry_id.

export type WindowKpiRow = {
  totalInquiries: number; // chain-based
  escalatedInquiries: number; // chain-based
  draftedInquiries: number; // chain-based (leaf status)
  sentInquiries: number; // chain-based (leaf status)
  messagesReceived: number; // row-based — every customer message in window
  avgResponseSeconds: number | null; // row-based — first draft latency per message
};

export async function getWindowKpis(firmId: string, start: Date, end: Date): Promise<WindowKpiRow> {
  const rows = await getPrisma().$queryRaw<
    {
      total: bigint;
      escalated: bigint;
      drafted: bigint;
      sent: bigint;
      messages: bigint;
      avg_response_seconds: number | null;
    }[]
  >`
    WITH leaf AS (
      SELECT i.id, i.status, i.received_at
      FROM inquiries i
      WHERE i.firm_id = ${firmId}::uuid
        AND i.received_at >= ${start}
        AND i.received_at < ${end}
        AND NOT EXISTS (
          SELECT 1 FROM inquiries c WHERE c.parent_inquiry_id = i.id
        )
    ),
    msg AS (
      SELECT i.id, i.status, i.received_at
      FROM inquiries i
      WHERE i.firm_id = ${firmId}::uuid
        AND i.received_at >= ${start}
        AND i.received_at < ${end}
    )
    SELECT
      (SELECT COUNT(*)::bigint FROM leaf) AS total,
      (SELECT COUNT(*)::bigint FROM leaf WHERE status = 'escalated') AS escalated,
      (SELECT COUNT(*)::bigint FROM leaf WHERE status = 'drafted') AS drafted,
      (SELECT COUNT(*)::bigint FROM leaf WHERE status = 'sent') AS sent,
      (SELECT COUNT(*)::bigint FROM msg) AS messages,
      (
        SELECT AVG(
          EXTRACT(EPOCH FROM (
            (SELECT MIN(d.created_at) FROM drafts d WHERE d.inquiry_id = m.id) - m.received_at
          ))
        ) FILTER (WHERE m.status IN ('drafted', 'sent'))
        FROM msg m
      ) AS avg_response_seconds
  `;
  const row = rows[0];
  if (!row) {
    return {
      totalInquiries: 0,
      escalatedInquiries: 0,
      draftedInquiries: 0,
      sentInquiries: 0,
      messagesReceived: 0,
      avgResponseSeconds: null,
    };
  }
  return {
    totalInquiries: Number(row.total),
    escalatedInquiries: Number(row.escalated),
    draftedInquiries: Number(row.drafted),
    sentInquiries: Number(row.sent),
    messagesReceived: Number(row.messages),
    avgResponseSeconds: row.avg_response_seconds,
  };
}

export type DailyBucket = { day: string; total: number; sent: number; escalated: number };

export async function getDailyBuckets(
  firmId: string,
  start: Date,
  end: Date,
): Promise<DailyBucket[]> {
  // Chain-based — one count per conversation that bucketed into this day,
  // matching the inbox cardinality.
  return getPrisma().$queryRaw<DailyBucket[]>`
    SELECT
      to_char(date_trunc('day', i.received_at), 'YYYY-MM-DD') AS day,
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE i.status = 'sent')::int AS sent,
      COUNT(*) FILTER (WHERE i.status = 'escalated')::int AS escalated
    FROM inquiries i
    WHERE i.firm_id = ${firmId}::uuid
      AND i.received_at >= ${start}
      AND i.received_at < ${end}
      AND NOT EXISTS (
        SELECT 1 FROM inquiries c WHERE c.parent_inquiry_id = i.id
      )
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
  // Chain-based — distribution of topics across conversations. Each chain's
  // category comes from the leaf's analysis (latest triage call).
  return getPrisma().$queryRaw<CategoryDistributionRow[]>`
    SELECT
      COALESCE(NULLIF(i.analysis->>'category', ''), 'その他') AS category,
      COUNT(*)::int AS count
    FROM inquiries i
    WHERE i.firm_id = ${firmId}::uuid
      AND i.received_at >= ${start}
      AND i.received_at < ${end}
      AND NOT EXISTS (
        SELECT 1 FROM inquiries c WHERE c.parent_inquiry_id = i.id
      )
    GROUP BY 1
    ORDER BY count DESC
  `;
}
