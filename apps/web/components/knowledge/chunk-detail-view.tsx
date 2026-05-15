import type { KnowledgeListItem } from '@zeiro/db';
import { Icon } from '@/components/ui/icon';

type Props = {
  chunk: KnowledgeListItem;
};

export function ChunkDetailView({ chunk }: Props) {
  const segments = chunk.source.split('/').map((s) => s.trim());
  const title = segments[segments.length - 1] ?? chunk.source;
  const breadcrumb = segments.slice(0, -1);
  const meta = chunk.metadata as Record<string, unknown>;
  const ingestedAt = typeof meta.ingestedAt === 'string' ? meta.ingestedAt : null;
  const category = typeof meta.category === 'string' ? meta.category : null;
  const pack = typeof meta.pack === 'string' ? meta.pack : null;
  const flagged = meta.requiresReview === true;
  const reason = typeof meta.reviewReason === 'string' ? meta.reviewReason : null;

  return (
    <article className="kb-chunk">
      <header className="kb-chunk-head">
        <div className="kb-library-eyebrow">
          {breadcrumb.length > 0 ? (
            breadcrumb.map((seg, i, all) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: breadcrumb order is frozen for a given source
              <span key={`${seg}-${i}`}>
                {seg}
                {i < all.length - 1 && <span className="kb-library-eyebrow-sep" aria-hidden />}
              </span>
            ))
          ) : (
            <span>ナレッジエントリ</span>
          )}
        </div>
        <h1 className="kb-chunk-title">{title}</h1>
        <div className="kb-chunk-tags">
          {pack && (
            <span className="kb-tag kb-tag-pack">
              <Icon name="book" size={11} /> {pack}
            </span>
          )}
          {category && <span className="kb-tag">{category}</span>}
          {chunk.scope === 'global' ? (
            <span className="kb-tag kb-tag-scope">共有</span>
          ) : (
            <span className="kb-tag kb-tag-scope">所内限定</span>
          )}
          {flagged && (
            <span className="kb-tag kb-tag-flag">
              <Icon name="flag" size={11} /> 要レビュー
            </span>
          )}
        </div>
      </header>

      <div className="kb-chunk-layout">
        <section className="kb-chunk-content">
          <h2 className="kb-chunk-section-label">内容</h2>
          <div className="kb-chunk-body">{chunk.content}</div>
        </section>
        <aside className="kb-chunk-side">
          <h2 className="kb-chunk-section-label">メタ情報</h2>
          <dl className="kb-chunk-meta">
            <MetaRow label="出典" value={chunk.source} mono />
            {pack && <MetaRow label="パック" value={pack} />}
            {category && <MetaRow label="カテゴリ" value={category} />}
            <MetaRow
              label="範囲"
              value={chunk.scope === 'global' ? '共有 (全テナント)' : '事務所限定'}
            />
            <MetaRow label="取込日" value={ingestedAt ? formatJpDate(ingestedAt) : '—'} mono />
            <MetaRow
              label="状態"
              value={flagged ? `要レビュー${reason ? ` · ${reason}` : ''}` : '最新'}
            />
            <MetaRow label="チャンクID" value={chunk.id} mono small />
          </dl>
        </aside>
      </div>
    </article>
  );
}

function MetaRow({
  label,
  value,
  mono = false,
  small = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  small?: boolean;
}) {
  return (
    <div className="kb-chunk-meta-row">
      <dt>{label}</dt>
      <dd className={`${mono ? 'is-mono' : ''}${small ? ' is-small' : ''}`}>{value}</dd>
    </div>
  );
}

function formatJpDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}
