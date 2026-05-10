import { listKnowledgeChunks } from '@zeiro/db';
import Link from 'next/link';
import { KnowledgeStats } from '@/components/knowledge/knowledge-stats';
import { KnowledgeTable } from '@/components/knowledge/knowledge-table';
import { Icon } from '@/components/ui/icon';
import { requireFirmContext } from '@/lib/firm-context';
import { readStatus } from '@/lib/knowledge-derived';

type SearchParams = { ingested?: string };

export default async function KnowledgePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { firmId } = await requireFirmContext();
  const [items, params] = await Promise.all([listKnowledgeChunks(firmId), searchParams]);

  const fresh = items.filter((i) => readStatus(i) === 'fresh').length;
  const review = items.filter((i) => readStatus(i) === 'review').length;
  const outdated = items.filter((i) => readStatus(i) === 'outdated').length;

  return (
    <div className="kb-pane anim-stagger">
      <div className="kb-head">
        <div>
          <div className="kb-title">ナレッジベース</div>
          <div className="kb-sub">事務所固有のFAQ・マニュアル・過去回答 — 全{items.length}件</div>
        </div>
        <div className="btn-cluster">
          <button type="button" className="btn btn-secondary">
            <Icon name="filter" size={13} /> フィルタ
          </button>
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
      <KnowledgeTable items={items} />
    </div>
  );
}
