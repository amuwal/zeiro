import { auditActionEnum, SYSTEM_ACTOR_ID } from '@zeiro/core';
import { listAuditEvents, listFirmUsers } from '@zeiro/db';
import { NextResponse } from 'next/server';
import { resolveWindow } from '@/lib/analytics-window';
import { ctxCan } from '@/lib/authz';
import { csvRow } from '@/lib/csv';
import { requireFirmContext } from '@/lib/firm-context';

const MAX_ROWS = 10_000;
const BATCH_SIZE = 500;

export async function GET(request: Request) {
  const ctx = await requireFirmContext();
  if (!ctxCan(ctx, 'audit.view')) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const url = new URL(request.url);
  const action = parseAction(url.searchParams.get('action'));
  const actor = parseActor(url.searchParams.get('actor'));
  const resolution = resolveWindow(url.searchParams.get('window') ?? undefined);

  const users = await listFirmUsers(ctx.firmId);
  const userById = new Map(users.map((u) => [u.id, u]));

  const filename = `zeiro-audit-${ctx.firmId.slice(0, 8)}-${resolution.window}-${formatDay(new Date())}.csv`;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      const header = csvRow([
        'createdAt',
        'action',
        'actorName',
        'actorEmail',
        'inquiryId',
        'metadata',
      ]);
      controller.enqueue(encoder.encode(`${header}\n`));

      let cursor: { createdAt: Date; id: string } | undefined;
      let written = 0;
      while (written < MAX_ROWS) {
        const { rows, nextCursor } = await listAuditEvents(
          ctx.firmId,
          {
            ...(action ? { action } : {}),
            ...(actor ? { actorId: actor } : {}),
            after: resolution.current.start,
            before: resolution.current.end,
          },
          cursor,
          BATCH_SIZE,
        );
        if (rows.length === 0) break;
        for (const row of rows) {
          const actorRecord =
            row.actorId === SYSTEM_ACTOR_ID
              ? { name: 'system', email: '' }
              : (userById.get(row.actorId) ?? { name: '(deleted)', email: '' });
          const line = csvRow([
            row.createdAt,
            row.action,
            actorRecord.name,
            actorRecord.email,
            row.inquiryId ?? '',
            row.metadata,
          ]);
          controller.enqueue(encoder.encode(`${line}\n`));
          written += 1;
          if (written >= MAX_ROWS) break;
        }
        if (!nextCursor) break;
        cursor = nextCursor;
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}

function parseAction(input: string | null) {
  if (!input) return undefined;
  const parsed = auditActionEnum.safeParse(input);
  return parsed.success ? parsed.data : undefined;
}

function parseActor(input: string | null): string | undefined {
  if (!input || input === 'all') return undefined;
  return /^[0-9a-f-]{36}$/i.test(input) ? input : undefined;
}

function formatDay(d: Date): string {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}
