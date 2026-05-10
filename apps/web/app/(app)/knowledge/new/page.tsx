import Link from 'next/link';
import { IngestForm } from '@/components/knowledge/ingest-form';
import { requireFirmContext } from '@/lib/firm-context';

export default async function NewKnowledgePage() {
  await requireFirmContext();
  return (
    <div className="kb-pane anim-stagger">
      <div className="kb-head">
        <div>
          <div className="kb-title">ナレッジを追加</div>
          <div className="kb-sub">
            テキストまたは .eml をアップロード — 文単位で自動チャンク・埋め込み
          </div>
        </div>
        <Link href="/knowledge" className="btn btn-secondary">
          一覧へ戻る
        </Link>
      </div>
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 14,
          padding: '1.5rem',
        }}
      >
        <IngestForm />
      </div>
    </div>
  );
}
