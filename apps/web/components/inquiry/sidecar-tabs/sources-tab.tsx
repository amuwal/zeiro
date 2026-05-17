'use client';

export type SourceItem = {
  id: string;
  title: string;
  src: string;
  section: string;
  status: 'fresh' | 'review' | 'outdated';
  score: number;
};

type Props = {
  citations: SourceItem[];
  highlightedCite: string | null;
  onCiteHover: (id: string) => void;
  onCiteLeave: () => void;
};

export function SourcesTab({ citations, highlightedCite, onCiteHover, onCiteLeave }: Props) {
  if (citations.length === 0) {
    return (
      <div className="sc-pane">
        <div className="empty">参照されたナレッジはありません</div>
      </div>
    );
  }
  return (
    <div className="sc-pane">
      <section className="sc-block">
        <div className="sc-block-head">
          <span>参照ナレッジ</span>
          <span className="meta">{citations.length}件</span>
        </div>
        <div className="cite-list">
          {citations.map((k, i) => (
            <div
              key={k.id}
              className={`cite-row ${highlightedCite === k.id ? 'active' : ''}`}
              onMouseEnter={() => onCiteHover(k.id)}
              onMouseLeave={onCiteLeave}
            >
              <div className="cite-num">{(i + 1).toString().padStart(2, '0')}</div>
              <div className="cite-content">
                <div className="cite-title">{k.title}</div>
                <div className="cite-meta">
                  <span className="src">{k.src}</span>
                  <span className="dot">·</span>
                  <span>{k.section}</span>
                  {k.status !== 'fresh' && (
                    <>
                      <span className="dot">·</span>
                      <span className={`kbstatus ${k.status}`}>{k.status.toUpperCase()}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="cite-score">{k.score.toFixed(2)}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
