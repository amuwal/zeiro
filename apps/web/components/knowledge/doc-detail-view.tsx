import type { KnowledgeListItem } from '@zeiro/db';
import Link from 'next/link';
import { flagChunk, unflagChunk } from '@/app/(app)/knowledge/actions';
import { Icon } from '@/components/ui/icon';

type Props = {
  chunks: KnowledgeListItem[];
};

export function DocDetailView({ chunks }: Props) {
  const first = chunks[0];
  if (!first) return null;
  const meta = first.metadata as Record<string, unknown>;
  const ingestedAt = typeof meta.ingestedAt === 'string' ? meta.ingestedAt : null;
  const docId = typeof meta.documentId === 'string' ? meta.documentId : first.source;
  const flaggedCount = chunks.filter(
    (c) => (c.metadata as Record<string, unknown>).requiresReview === true,
  ).length;

  return (
    <>
      <header className="kb-detail-head">
        <div>
          <div className="kb-library-eyebrow">
            <span>事務所ナレッジ</span>
            <span className="kb-library-eyebrow-sep" aria-hidden />
            <span>{chunks.length} チャンク</span>
          </div>
          <h1 className="kb-detail-title">{first.source}</h1>
          <p className="kb-detail-desc">
            このドキュメントから {chunks.length} 件のチャンクが生成されています。AI
            は問い合わせ内容に応じて最も関連性の高いチャンクのみを下書きに使用します。
          </p>
        </div>
        <aside className="kb-detail-aside">
          <dl className="kb-detail-stats">
            <div>
              <dt>チャンク</dt>
              <dd>{chunks.length}</dd>
            </div>
            <div>
              <dt>要レビュー</dt>
              <dd className={flaggedCount === 0 ? 'is-empty' : ''}>{flaggedCount}</dd>
            </div>
          </dl>
          <div className="kb-doc-detail-meta">
            <div>
              <span className="kb-doc-detail-meta-label">取込日</span>
              <span className="kb-doc-detail-meta-value">
                {ingestedAt ? formatJpDate(ingestedAt) : '—'}
              </span>
            </div>
            <div>
              <span className="kb-doc-detail-meta-label">ドキュメントID</span>
              <span className="kb-doc-detail-meta-value is-mono">{docId.slice(0, 12)}…</span>
            </div>
          </div>
        </aside>
      </header>

      <section className="kb-cat">
        <header className="kb-cat-head">
          <div className="kb-cat-head-row">
            <Icon name="doc" size={14} />
            <h2 className="kb-cat-title">チャンク一覧</h2>
          </div>
          <span className="kb-cat-count">
            {chunks.length} <span className="kb-cat-count-total">件</span>
          </span>
        </header>
        <ul className="kb-entry-list">
          {chunks.map((c, i) => (
            <ChunkRow key={c.id} chunk={c} index={i + 1} />
          ))}
        </ul>
      </section>
    </>
  );
}

function ChunkRow({ chunk, index }: { chunk: KnowledgeListItem; index: number }) {
  const meta = chunk.metadata as Record<string, unknown>;
  const flagged = meta.requiresReview === true;
  const reason = typeof meta.reviewReason === 'string' ? meta.reviewReason : null;
  return (
    <li className={`kb-entry${flagged ? ' is-flagged' : ''}`}>
      <div className="kb-entry-body">
        <div className="kb-entry-row-head">
          <span className="kb-entry-index">{String(index).padStart(2, '0')}</span>
          <Link href={`/knowledge/chunks/${chunk.id}`} className="kb-entry-title">
            {chunk.source}
          </Link>
        </div>
        <p className="kb-entry-preview kb-entry-preview-3">{chunk.content}</p>
        {flagged && reason && (
          <div className="kb-entry-note">
            <Icon name="flag" size={11} /> {reason}
          </div>
        )}
      </div>
      <div className="kb-entry-doc-actions">
        {flagged ? (
          <form action={unflagChunk}>
            <input type="hidden" name="chunkId" value={chunk.id} />
            <button type="submit" className="kb-doc-action confirm">
              確認済み
            </button>
          </form>
        ) : (
          <form action={flagChunk}>
            <input type="hidden" name="chunkId" value={chunk.id} />
            <button type="submit" className="kb-doc-action flag">
              要レビュー
            </button>
          </form>
        )}
        <Link href={`/knowledge/chunks/${chunk.id}`} className="kb-doc-action open">
          詳細
          <Icon name="chevron-right" size={11} />
        </Link>
      </div>
    </li>
  );
}

function formatJpDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}
