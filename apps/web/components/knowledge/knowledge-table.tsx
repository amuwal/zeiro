import type { KnowledgeListItem } from '@zeiro/db';
import { flagChunk, unflagChunk } from '@/app/(app)/knowledge/actions';
import {
  type KbStatus,
  readRequiresReview,
  readReviewReason,
  readSection,
  readStatus,
  readTitle,
  readUpdated,
  readUses,
} from '@/lib/knowledge-derived';

const FLAG: Record<KbStatus, { cls: string; label: string }> = {
  fresh: { cls: 'fresh', label: '最新' },
  review: { cls: 'review', label: '要レビュー' },
  outdated: { cls: 'outdated', label: '法改正' },
};

export function KnowledgeTable({ items }: { items: KnowledgeListItem[] }) {
  return (
    <div className="kb-table">
      <div className="kb-row head">
        <span>タイトル</span>
        <span>出典</span>
        <span>使用回数</span>
        <span>更新日</span>
        <span>状態</span>
        <span>操作</span>
      </div>
      {items.map((item) => {
        const flag = FLAG[readStatus(item)];
        const section = readSection(item);
        const flagged = readRequiresReview(item);
        const reason = readReviewReason(item);
        return (
          <div key={item.id} className="kb-row">
            <div>
              <div className="doc-title">{readTitle(item)}</div>
              <div className="doc-sub">
                {item.id.slice(0, 8)}
                {section ? ` · ${section}` : ''}
                {flagged && reason ? ` · ${reason}` : ''}
              </div>
            </div>
            <span className="src">{item.source}</span>
            <span className="uses">{readUses(item)}</span>
            <span className="updated">{readUpdated(item) ?? '—'}</span>
            <span>
              <span className={`kb-flag ${flag.cls}`}>{flag.label}</span>
            </span>
            <span>
              {flagged ? (
                <form action={unflagChunk}>
                  <input type="hidden" name="chunkId" value={item.id} />
                  <button type="submit" className="kb-action-btn unflag">
                    確認済
                  </button>
                </form>
              ) : (
                <form action={flagChunk}>
                  <input type="hidden" name="chunkId" value={item.id} />
                  <button type="submit" className="kb-action-btn flag">
                    要レビュー
                  </button>
                </form>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}
