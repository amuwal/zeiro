import { auditActionEnum } from '@zeiro/core';
import { listAuditEvents, listFirmUsers } from '@zeiro/db';
import { notFound } from 'next/navigation';
import { AuditFilters } from '@/components/audit/audit-filters';
import { AuditTable } from '@/components/audit/audit-table';
import { resolveWindow } from '@/lib/analytics-window';
import { ctxCan } from '@/lib/authz';
import { requireFirmContext } from '@/lib/firm-context';

const PAGE_SIZE = 50;

type SearchParams = {
  action?: string;
  actor?: string;
  window?: string;
  cursor?: string;
};

export default async function AuditPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const ctx = await requireFirmContext();
  if (!ctxCan(ctx, 'audit.view')) notFound();
  const { firmId } = ctx;

  const params = await searchParams;
  const action = parseAction(params.action);
  const actor = parseActor(params.actor);
  const resolution = resolveWindow(params.window);
  const cursor = parseCursor(params.cursor);

  const [{ rows, nextCursor }, users] = await Promise.all([
    listAuditEvents(
      firmId,
      {
        ...(action ? { action } : {}),
        ...(actor ? { actorId: actor } : {}),
        after: resolution.current.start,
        before: resolution.current.end,
      },
      cursor,
      PAGE_SIZE,
    ),
    listFirmUsers(firmId),
  ]);

  const userById = new Map(users.map((u) => [u.id, u]));
  const filteredQs = buildQs({ action, actor, window: resolution.window });
  const nextHref = nextCursor ? `/audit?${filteredQs}&cursor=${encodeCursor(nextCursor)}` : null;

  return (
    <div className="audit-pane anim-stagger">
      <div className="audit-head">
        <div>
          <div className="audit-title">監査ログ</div>
          <div className="audit-sub">
            {resolution.label} · {rows.length}件{nextCursor ? ' (続きあり)' : ''}
          </div>
        </div>
        <a
          href={`/api/audit/export${filteredQs ? `?${filteredQs}` : ''}`}
          className="btn btn-secondary"
          download
        >
          CSV エクスポート
        </a>
      </div>
      <AuditFilters users={users} active={{ action, actor, window: resolution.window }} />
      <AuditTable rows={rows} userById={userById} />
      {nextHref && (
        <div className="audit-pager">
          <a href={nextHref} className="btn btn-secondary">
            次のページ
          </a>
        </div>
      )}
    </div>
  );
}

function parseAction(input: string | undefined) {
  if (!input) return undefined;
  const parsed = auditActionEnum.safeParse(input);
  return parsed.success ? parsed.data : undefined;
}

function parseActor(input: string | undefined): string | undefined {
  if (!input || input === 'all') return undefined;
  return /^[0-9a-f-]{36}$/i.test(input) ? input : undefined;
}

function parseCursor(input: string | undefined): { createdAt: Date; id: string } | undefined {
  if (!input) return undefined;
  try {
    const decoded = JSON.parse(Buffer.from(input, 'base64url').toString('utf-8'));
    if (
      typeof decoded?.createdAt === 'string' &&
      typeof decoded?.id === 'string' &&
      /^[0-9a-f-]{36}$/i.test(decoded.id)
    ) {
      const date = new Date(decoded.createdAt);
      if (!Number.isNaN(date.getTime())) return { createdAt: date, id: decoded.id };
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function encodeCursor(c: { createdAt: Date; id: string }): string {
  return Buffer.from(
    JSON.stringify({ createdAt: c.createdAt.toISOString(), id: c.id }),
    'utf-8',
  ).toString('base64url');
}

function buildQs(args: {
  action: string | undefined;
  actor: string | undefined;
  window: string;
}): string {
  const parts: string[] = [];
  if (args.action) parts.push(`action=${encodeURIComponent(args.action)}`);
  if (args.actor) parts.push(`actor=${encodeURIComponent(args.actor)}`);
  if (args.window !== '30d') parts.push(`window=${encodeURIComponent(args.window)}`);
  return parts.join('&');
}
