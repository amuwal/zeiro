import type { GlobalSourceListing } from '@zeiro/db';
import Link from 'next/link';
import { toggleAllGlobalSources, toggleGlobalSource } from '@/app/(app)/knowledge/actions';
import { Icon } from '@/components/ui/icon';

type Pack = {
  title: string;
  description: string;
  eyebrow: string;
};

type Props = {
  pack: Pack;
  listings: GlobalSourceListing[];
};

export function PackDetailView({ pack, listings }: Props) {
  const enabled = listings.filter((l) => !l.disabled).length;
  const allOn = enabled === listings.length;
  const allOff = enabled === 0;
  const grouped = groupByCategory(listings);

  return (
    <>
      <header className="kb-detail-head">
        <div>
          <div className="kb-library-eyebrow">
            <span>{pack.eyebrow}</span>
            <span className="kb-library-eyebrow-sep" aria-hidden />
            <span>共有・全社対象</span>
          </div>
          <h1 className="kb-detail-title">{pack.title}</h1>
          <p className="kb-detail-desc">{pack.description}</p>
        </div>
        <aside className="kb-detail-aside">
          <dl className="kb-detail-stats">
            <div>
              <dt>収録</dt>
              <dd>{listings.length}件</dd>
            </div>
            <div>
              <dt>有効</dt>
              <dd className={allOff ? 'is-empty' : ''}>
                {enabled} <span>/ {listings.length}</span>
              </dd>
            </div>
          </dl>
          <form action={toggleAllGlobalSources} className="kb-pack-master-form">
            <input type="hidden" name="next" value={allOn ? 'disabled' : 'enabled'} />
            <button type="submit" className={`kb-pack-master${allOn ? ' is-on' : ''}`}>
              <span className="kb-pack-master-knob" />
              <span className="kb-pack-master-label">
                {allOn ? '一括無効化' : allOff ? '一括有効化' : `${enabled}件のみ有効`}
              </span>
            </button>
          </form>
        </aside>
      </header>

      <div className="kb-detail-groups">
        {grouped.map(([category, items]) => (
          <CategoryBlock key={category} category={category} items={items} />
        ))}
      </div>
    </>
  );
}

function CategoryBlock({ category, items }: { category: string; items: GlobalSourceListing[] }) {
  const enabledCount = items.filter((i) => !i.disabled).length;
  return (
    <section className="kb-cat">
      <header className="kb-cat-head">
        <div className="kb-cat-head-row">
          <span className="kb-cat-dot" data-cat={categoryKey(category)} aria-hidden />
          <h2 className="kb-cat-title">{category}</h2>
        </div>
        <span className="kb-cat-count">
          {enabledCount} <span className="kb-cat-count-total">/ {items.length} 件有効</span>
        </span>
      </header>
      <ul className="kb-entry-list">
        {items.map((item) => (
          <EntryRow key={item.source} item={item} />
        ))}
      </ul>
    </section>
  );
}

function EntryRow({ item }: { item: GlobalSourceListing }) {
  const title = lastSegment(item.source);
  return (
    <li className={`kb-entry${item.disabled ? ' is-disabled' : ''}`}>
      <div className="kb-entry-body">
        <Link href={`/knowledge/chunks/${item.id}`} className="kb-entry-title">
          {title}
        </Link>
        <p className="kb-entry-preview">{item.content}</p>
        <div className="kb-entry-foot">
          <span className="kb-entry-source">{item.source}</span>
          <Link href={`/knowledge/chunks/${item.id}`} className="kb-entry-open">
            詳細
            <Icon name="chevron-right" size={11} />
          </Link>
        </div>
      </div>
      <form action={toggleGlobalSource} className="kb-entry-toggle-form">
        <input type="hidden" name="source" value={item.source} />
        <input type="hidden" name="next" value={item.disabled ? 'enabled' : 'disabled'} />
        <button
          type="submit"
          className={`kb-entry-toggle${item.disabled ? '' : ' is-on'}`}
          aria-pressed={!item.disabled}
          aria-label={item.disabled ? '有効化' : '無効化'}
        >
          <span className="kb-entry-toggle-knob" />
        </button>
      </form>
    </li>
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

function lastSegment(source: string): string {
  const parts = source.split('/').map((p) => p.trim());
  return parts[parts.length - 1] ?? source;
}
