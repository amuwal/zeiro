'use client';

import type { Citation } from '@zeiro/core';
import { forwardRef } from 'react';

type Props = {
  citations: Citation[];
  activeIndex: number | null;
  onActivate: (citationIndex: number) => void;
  registerRow: (citationIndex: number, el: HTMLButtonElement | null) => void;
};

export function CitationList({ citations, activeIndex, onActivate, registerRow }: Props) {
  if (citations.length === 0) return null;
  return (
    <div className="section">
      <div className="section-head">
        <span>SOURCE KNOWLEDGE</span>
        <span className="badge">{citations.length} 件</span>
      </div>
      <div className="cite-list">
        {citations.map((c, i) => {
          const index = i + 1;
          return (
            <CitationRow
              ref={(el) => registerRow(index, el)}
              key={`${c.source}::${c.snippet.slice(0, 64)}`}
              index={index}
              citation={c}
              active={activeIndex === index}
              onActivate={() => onActivate(index)}
            />
          );
        })}
      </div>
    </div>
  );
}

type RowProps = {
  index: number;
  citation: Citation;
  active: boolean;
  onActivate: () => void;
};

const CitationRow = forwardRef<HTMLButtonElement, RowProps>(function CitationRow(
  { index, citation, active, onActivate },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      className={`cite-row${active ? ' is-active' : ''}`}
      onClick={onActivate}
    >
      <div className="cite-num">{index.toString().padStart(2, '0')}</div>
      <div className="cite-content">
        <div className="cite-title">{citation.source}</div>
        <div className="cite-snippet">{citation.snippet}</div>
      </div>
    </button>
  );
});
