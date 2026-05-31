'use client';

import { useEffect, useState } from 'react';
import type { CiteProps, DraftBlock } from './types';

type Props = CiteProps & {
  blocks: DraftBlock[];
  typing: boolean;
};

export function DraftBlocksView({
  blocks,
  highlightedCite,
  onCiteHover,
  onCiteLeave,
  typing,
}: Props) {
  const [shown, setShown] = useState(typing ? 0 : blocks.length);
  useEffect(() => {
    if (!typing) {
      setShown(blocks.length);
      return;
    }
    setShown(0);
    let i = 0;
    const id = setInterval(() => {
      i++;
      setShown(i);
      if (i >= blocks.length) clearInterval(id);
    }, 22);
    return () => clearInterval(id);
  }, [blocks.length, typing]);

  return (
    <div className="draft-body">
      {blocks.slice(0, shown).map((b, i) => (
        <span key={i}>
          {b.text}
          {b.cite && (
            <a
              className={`cite ${highlightedCite === b.cite ? 'active' : ''}`}
              onMouseEnter={() => onCiteHover(b.cite as string)}
              onMouseLeave={onCiteLeave}
            >
              {b.cite.replace(/^c/i, '')}
            </a>
          )}
        </span>
      ))}
      {typing && shown < blocks.length && <span className="typing-caret" />}
    </div>
  );
}
