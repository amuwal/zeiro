import type { ThreadInquiry } from '@zeiro/db';
import { Avatar } from '@/components/ui/avatar';
import { Icon } from '@/components/ui/icon';
import { formatFullJST, formatRelativeTime, makePreview } from '@/lib/format';
import { readSenderName } from '@/lib/inquiry-derived';

type Props = {
  thread: ThreadInquiry[];
  firmName: string;
  currentInquiryId: string;
};

type TimelineEntry =
  | {
      kind: 'customer';
      at: Date;
      body: string;
      senderName: string;
      senderEmail: string;
      isCurrent: boolean;
      inquiryId: string;
    }
  | {
      kind: 'firm';
      at: Date;
      body: string;
      followUp: boolean;
      draftId: string;
      firmName: string;
    };

const ALWAYS_OPEN_TAIL = 2;

export function ConversationTimeline({ thread, firmName, currentInquiryId }: Props) {
  const entries = buildEntries(thread, firmName, currentInquiryId);
  if (entries.length === 0) return null;

  const expandFromIndex = Math.max(0, entries.length - ALWAYS_OPEN_TAIL);
  const olderCount = expandFromIndex;

  return (
    <section className="conv">
      <div className="section-head">
        <span>会話履歴</span>
        <span className="badge">{entries.length} 件</span>
        {olderCount > 0 && (
          <span className="conv-older-hint">過去 {olderCount} 件は折りたたみ</span>
        )}
      </div>
      <ol className="conv-list">
        {entries.map((entry, idx) => {
          const expanded = idx >= expandFromIndex;
          return (
            <li
              key={entryKey(entry)}
              className={`conv-row ${entry.kind}${
                entry.kind === 'customer' && entry.isCurrent ? ' current' : ''
              }`}
            >
              <EntryView entry={entry} expanded={expanded} />
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function EntryView({ entry, expanded }: { entry: TimelineEntry; expanded: boolean }) {
  const summary =
    entry.kind === 'customer' ? (
      <CustomerSummary entry={entry} expanded={expanded} />
    ) : (
      <FirmSummary entry={entry} expanded={expanded} />
    );
  if (expanded) {
    return (
      <details className="conv-details" open>
        <summary>{summary}</summary>
        <div className="conv-body">{entry.body}</div>
      </details>
    );
  }
  return (
    <details className="conv-details collapsed">
      <summary>{summary}</summary>
      <div className="conv-body">{entry.body}</div>
    </details>
  );
}

function CustomerSummary({
  entry,
  expanded,
}: {
  entry: Extract<TimelineEntry, { kind: 'customer' }>;
  expanded: boolean;
}) {
  return (
    <>
      <Avatar name={entry.senderName} />
      <div className="conv-summary">
        <header className="conv-meta">
          <span className="who">{entry.senderName}</span>
          {entry.senderEmail && <span className="email">{entry.senderEmail}</span>}
          {entry.isCurrent && <span className="current-pill">最新</span>}
          <time dateTime={entry.at.toISOString()} title={formatFullJST(entry.at)}>
            {formatRelativeTime(entry.at)}
          </time>
        </header>
        {!expanded && <div className="conv-snippet">{makePreview(entry.body, 110)}</div>}
        <span className="conv-toggle" aria-hidden>
          <Icon name="arrow-right" size={11} />
        </span>
      </div>
    </>
  );
}

function FirmSummary({
  entry,
  expanded,
}: {
  entry: Extract<TimelineEntry, { kind: 'firm' }>;
  expanded: boolean;
}) {
  return (
    <>
      <div className="conv-summary">
        <header className="conv-meta">
          <span className="who">{entry.firmName}</span>
          {entry.followUp && <span className="follow-up-pill">フォローアップ</span>}
          <time dateTime={entry.at.toISOString()} title={formatFullJST(entry.at)}>
            {formatRelativeTime(entry.at)}
          </time>
        </header>
        {!expanded && <div className="conv-snippet">{makePreview(entry.body, 110)}</div>}
        <span className="conv-toggle" aria-hidden>
          <Icon name="arrow-right" size={11} />
        </span>
      </div>
      <Avatar name={entry.firmName} />
    </>
  );
}

function entryKey(entry: TimelineEntry): string {
  return entry.kind === 'customer' ? `c-${entry.inquiryId}` : `f-${entry.draftId}`;
}

function buildEntries(
  thread: ThreadInquiry[],
  firmName: string,
  currentInquiryId: string,
): TimelineEntry[] {
  const entries: TimelineEntry[] = [];
  for (const inq of thread) {
    const senderName =
      inq.client?.name ?? readSenderName({ headers: inq.headers }) ?? '(未登録の送信者)';
    const senderEmail = inq.client?.primaryEmail ?? '';
    entries.push({
      kind: 'customer',
      at: inq.receivedAt,
      body: inq.body,
      senderName,
      senderEmail,
      isCurrent: inq.id === currentInquiryId,
      inquiryId: inq.id,
    });
    for (const draft of inq.drafts) {
      const sentAt = readSentAt(draft.metadata);
      if (!sentAt) continue;
      entries.push({
        kind: 'firm',
        at: new Date(sentAt),
        body: draft.body,
        followUp: readKind(draft.metadata) === 'follow_up',
        draftId: draft.id,
        firmName,
      });
    }
  }
  entries.sort((a, b) => a.at.getTime() - b.at.getTime());
  return entries;
}

function readSentAt(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null;
  const v = (metadata as { sentAt?: unknown }).sentAt;
  return typeof v === 'string' ? v : null;
}

function readKind(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null;
  const v = (metadata as { kind?: unknown }).kind;
  return typeof v === 'string' ? v : null;
}
