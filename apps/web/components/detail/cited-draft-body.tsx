'use client';

import type { CitationBlock } from '@zeiro/core';
import { useMemo } from 'react';

type Props = {
  body: string;
  blocks: CitationBlock[] | null;
  activeIndex: number | null;
  onSelectCitation: (citationIndex: number) => void;
};

type KeyedBlock = CitationBlock & { key: string };

export function CitedDraftBody({ body, blocks, activeIndex, onSelectCitation }: Props) {
  const keyed = useMemo<KeyedBlock[] | null>(() => keyBlocks(blocks), [blocks]);

  if (!keyed || keyed.length === 0) {
    return <div className="draft-body">{body}</div>;
  }
  return (
    <div className="draft-body">
      {keyed.map((block) => (
        <CitedBlock
          key={block.key}
          block={block}
          activeIndex={activeIndex}
          onSelectCitation={onSelectCitation}
        />
      ))}
    </div>
  );
}

// Each block's key is its starting character offset in the draft body, which
// is unique and stable as long as the draft text doesn't change.
function keyBlocks(blocks: CitationBlock[] | null): KeyedBlock[] | null {
  if (!blocks) return null;
  const out: KeyedBlock[] = [];
  let offset = 0;
  for (const block of blocks) {
    out.push({ ...block, key: `b-${offset}` });
    offset += block.text.length;
  }
  return out;
}

type BlockProps = {
  block: CitationBlock;
  activeIndex: number | null;
  onSelectCitation: (citationIndex: number) => void;
};

function CitedBlock({ block, activeIndex, onSelectCitation }: BlockProps) {
  return (
    <>
      {block.text}
      {block.citationIndexes.map((n) => (
        <button
          key={n}
          type="button"
          className={`cite-ref${activeIndex === n ? ' is-active' : ''}`}
          aria-label={`引用 ${n} を表示`}
          onClick={() => onSelectCitation(n)}
        >
          {n}
        </button>
      ))}
    </>
  );
}
