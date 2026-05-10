import { listKnowledgeChunks } from '@zeiro/db';
import Link from 'next/link';
import { BulkFlagForm } from '@/components/knowledge/bulk-flag-form';
import { KnowledgeStats } from '@/components/knowledge/knowledge-stats';
import { KnowledgeTable } from '@/components/knowledge/knowledge-table';
import { Icon } from '@/components/ui/icon';
import { requireFirmContext } from '@/lib/firm-context';
import { type KbStatus, readStatus } from '@/lib/knowledge-derived';

type SearchParams = { ingested?: string; status?: KbStatus };

export default async function KnowledgePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { firmId, role } = await requireFirmContext();
  const [items, params] = await Promise.all([listKnowledgeChunks(firmId), searchParams]);
  const admin = role.toLowerCase().includes('admin');

  const fresh = items.filter((i) => readStatus(i) === 'fresh').length;
  const review = items.filter((i) => readStatus(i) === 'review').length;
  const outdated = items.filter((i) => readStatus(i) === 'outdated').length;

  const visible = params.status ? items.filter((i) => readStatus(i) === params.status) : items;

  return (
    <div className="kb-pane anim-stagger">
      <div className="kb-head">
        <div>
          <div className="kb-title">ナレッジベース</div>
          <div className="kb-sub">
            事務所固有のFAQ・マニュアル・過去回答 — {visible.length} / {items.length}件
          </div>
        </div>
        <div className="btn-cluster">
          <Link
            href={params.status === 'review' ? '/knowledge' : '/knowledge?status=review'}
            className="btn btn-secondary"
          >
            <Icon name="filter" size={13} />
            {params.status === 'review' ? 'すべて表示' : '要レビューのみ'}
          </Link>
          <Link href="/knowledge/new" className="btn btn-primary">
            <Icon name="edit" size={13} /> 新規追加
          </Link>
        </div>
      </div>

      {params.ingested && (
        <div
          style={{
            background: 'var(--accent-soft)',
            color: 'var(--accent-ink)',
            padding: '10px 14px',
            borderRadius: 10,
            fontSize: 12.5,
          }}
        >
          {params.ingested}件のチャンクをナレッジに追加しました
        </div>
      )}

      <KnowledgeStats total={items.length} fresh={fresh} review={review} outdated={outdated} />

      {admin && (
        <section
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 10,
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9.5,
                color: 'var(--muted-2)',
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
              }}
            >
              法改正対応 · 一括フラグ
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
              キーワードに一致するチャンクをまとめて要レビュー状態にし、再確認まで検索対象から除外します。
            </div>
          </div>
          <BulkFlagForm />
        </section>
      )}

      <KnowledgeTable items={visible} />
    </div>
  );
}
