import { getPrisma } from '../server';

export type ReceivedDocument = {
  filename: string;
  kind: string | null;
  inquirySubject: string;
  receivedAt: string; // 'YYYY-MM-DD'
};

// Documents a 顧問先 has sent the firm — derived from the parsed-attachment
// metadata recorded on each inbound `inquiry.received` audit event (append-only,
// so this works for historical inquiries with no ingest change). Lets the agent
// answer "did you receive my 領収書?" with a grounded fact. firmId-scoped.
export async function listReceivedDocuments(
  firmId: string,
  clientId: string,
  limit = 20,
): Promise<ReceivedDocument[]> {
  const capped = Math.max(1, Math.min(50, limit));
  return getPrisma().$queryRaw<ReceivedDocument[]>`
    SELECT
      doc->>'filename' AS "filename",
      doc->>'kind' AS "kind",
      i.subject AS "inquirySubject",
      to_char(i.received_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS "receivedAt"
    FROM audit_events a
    JOIN inquiries i ON i.id = a.inquiry_id
    CROSS JOIN LATERAL jsonb_array_elements(a.metadata->'attachments'->'parsed') AS doc
    WHERE a.firm_id = ${firmId}::uuid
      AND i.client_id = ${clientId}::uuid
      AND a.action = 'inquiry.received'
      AND jsonb_typeof(a.metadata->'attachments'->'parsed') = 'array'
    ORDER BY i.received_at DESC
    LIMIT ${capped}
  `;
}
