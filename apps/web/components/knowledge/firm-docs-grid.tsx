import type { FirmDocumentSummary } from '@zeiro/db';
import Link from 'next/link';
import { Icon } from '@/components/ui/icon';

type Props = {
  documents: FirmDocumentSummary[];
};

export function FirmDocsGrid({ documents }: Props) {
  return (
    <section className="kb-firm-section">
      <header className="kb-firm-section-head">
        <div>
          <div className="kb-section-eyebrow">事務所ナレッジ</div>
          <h2 className="kb-section-title">所内のFAQ・マニュアル・過去回答</h2>
        </div>
        <p className="kb-section-hint">
          ファイルをアップロードすると AI が自動で分割・埋め込みを行います。送信済みの下書きは
          自動的にここへ追加されます。
        </p>
      </header>
      {documents.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="kb-doc-grid">
          {documents.map((doc) => (
            <li key={doc.documentId}>
              <DocCard doc={doc} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function DocCard({ doc }: { doc: FirmDocumentSummary }) {
  const last = doc.latestIngestedAt ? formatJpDate(doc.latestIngestedAt) : '—';
  return (
    <Link href={`/knowledge/docs/${encodeURIComponent(doc.documentId)}`} className="kb-doc-card">
      <div className="kb-doc-card-row">
        <span className="kb-doc-card-tag">
          <Icon name="doc" size={11} />
          {doc.chunks}チャンク
        </span>
        {doc.flagged && (
          <span className="kb-doc-card-flag">
            <Icon name="flag" size={10} /> 要レビュー
          </span>
        )}
      </div>
      <h3 className="kb-doc-card-title">{doc.source}</h3>
      <div className="kb-doc-card-meta">
        <span>最終取込</span>
        <time>{last}</time>
      </div>
      <span className="kb-doc-card-open">
        開く
        <Icon name="chevron-right" size={11} />
      </span>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="kb-firm-empty">
      <div className="kb-firm-empty-mark" aria-hidden>
        ✦
      </div>
      <h3>まだ事務所ナレッジがありません</h3>
      <p>
        過去のFAQ・マニュアル・送信済みメールを取り込むと、AI がそれを優先して下書きに使用します。
      </p>
      <Link href="/knowledge/new" className="btn btn-primary">
        <Icon name="upload" size={13} />
        ファイルを追加
      </Link>
    </div>
  );
}

function formatJpDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}
