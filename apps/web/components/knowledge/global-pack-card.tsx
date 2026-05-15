import type { GlobalSourceListing } from '@zeiro/db';
import Link from 'next/link';
import { toggleAllGlobalSources } from '@/app/(app)/knowledge/actions';
import { Icon } from '@/components/ui/icon';

type Props = {
  listings: GlobalSourceListing[];
};

export function GlobalPackCard({ listings }: Props) {
  if (listings.length === 0) return null;
  const enabled = listings.filter((l) => !l.disabled).length;
  const allOn = enabled === listings.length;
  const allOff = enabled === 0;
  const grouped = groupByCategory(listings);

  return (
    <article className="kb-pack-card">
      <span className="kb-pack-spine" aria-hidden />
      <div className="kb-pack-grid">
        <div className="kb-pack-meta">
          <div className="kb-pack-eyebrow">標準パック</div>
          <h2 className="kb-pack-title">JP税法FAQ</h2>
          <p className="kb-pack-desc">
            事務所共通の基本Q&A —
            申告期限・書類提出・税務質問など、よく聞かれる質問への一次回答用に。
          </p>
          <dl className="kb-pack-stats">
            <div>
              <dt>収録</dt>
              <dd>{listings.length} 件</dd>
            </div>
            <div>
              <dt>有効</dt>
              <dd className={allOff ? 'is-empty' : ''}>
                {enabled} <span className="kb-pack-stats-sub">/ {listings.length}</span>
              </dd>
            </div>
            <div>
              <dt>カテゴリ</dt>
              <dd>{grouped.length}</dd>
            </div>
          </dl>
          <div className="kb-pack-actions">
            <form action={toggleAllGlobalSources} className="kb-pack-master-form">
              <input type="hidden" name="next" value={allOn ? 'disabled' : 'enabled'} />
              <button type="submit" className={`kb-pack-master${allOn ? ' is-on' : ''}`}>
                <span className="kb-pack-master-knob" />
                <span className="kb-pack-master-label">
                  {allOn ? '一括無効化' : allOff ? '一括有効化' : `${enabled}件のみ有効`}
                </span>
              </button>
            </form>
            <Link href="/knowledge/packs/jp-tax-faq" className="kb-pack-open">
              詳細を見る
              <Icon name="chevron-right" size={13} />
            </Link>
          </div>
        </div>
        <ul className="kb-pack-categories">
          {grouped.map(([category, items]) => (
            <li key={category} className="kb-pack-category">
              <span className="kb-pack-category-dot" data-cat={categoryKey(category)} aria-hidden />
              <span className="kb-pack-category-name">{category}</span>
              <span className="kb-pack-category-count">
                {items.filter((i) => !i.disabled).length}
                <span className="kb-pack-category-total"> / {items.length}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

function groupByCategory(items: GlobalSourceListing[]): [string, GlobalSourceListing[]][] {
  const groups = new Map<string, GlobalSourceListing[]>();
  for (const item of items) {
    const category = categoryOf(item) ?? 'その他';
    const bucket = groups.get(category) ?? [];
    bucket.push(item);
    groups.set(category, bucket);
  }
  return Array.from(groups.entries());
}

function categoryOf(item: GlobalSourceListing): string | null {
  const fromMeta = item.metadata.category;
  if (typeof fromMeta === 'string') return fromMeta;
  const parts = item.source.split('/').map((p) => p.trim());
  return parts.length >= 2 ? (parts[1] ?? null) : null;
}

function categoryKey(name: string): string {
  switch (name) {
    case '期日確認':
      return 'deadline';
    case '書類提出':
      return 'docs';
    case '税務質問':
      return 'tax';
    case '顧問契約':
      return 'contract';
    default:
      return 'other';
  }
}
