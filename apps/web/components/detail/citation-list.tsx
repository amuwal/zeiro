import type { Citation } from '@zeiro/core';

export function CitationList({ citations }: { citations: Citation[] }) {
  if (citations.length === 0) return null;
  return (
    <div className="section">
      <div className="section-head">
        <span>SOURCE KNOWLEDGE</span>
        <span className="badge">{citations.length} 件</span>
      </div>
      <div className="cite-list">
        {citations.map((c, i) => (
          <CitationRow key={`${c.source}-${i}`} index={i + 1} citation={c} />
        ))}
      </div>
    </div>
  );
}

function CitationRow({ index, citation }: { index: number; citation: Citation }) {
  return (
    <div className="cite-row">
      <div className="cite-num">{index.toString().padStart(2, '0')}</div>
      <div className="cite-content">
        <div className="cite-title">{citation.source}</div>
        <div className="cite-snippet">{citation.snippet}</div>
      </div>
    </div>
  );
}
