'use client';

import type { DraftWithCitations } from '@zeiro/db';
import { Icon } from '@/components/ui/icon';
import { formatFullJST } from '@/lib/format';
import { CitedDraftBody } from './cited-draft-body';

type Props = {
  draft: DraftWithCitations;
  editing: boolean;
  body: string;
  edited: boolean;
  activeCitationIndex: number | null;
  onToggleEdit: () => void;
  onChangeBody: (body: string) => void;
  onSelectCitation: (citationIndex: number) => void;
};

export function EditableDraftCard({
  draft,
  editing,
  body,
  edited,
  activeCitationIndex,
  onToggleEdit,
  onChangeBody,
  onSelectCitation,
}: Props) {
  return (
    <div className="section">
      <div className="section-head">
        <span>AI DRAFT</span>
        <span className="badge">{draft.model.toUpperCase()}</span>
      </div>
      <div className="draft-card">
        <div className="draft-head">
          <span className="label">下書き</span>
          <span className="gen-time">
            生成 {formatFullJST(draft.createdAt)} · {draft.citations.length}件のナレッジを参照
            {edited ? ' · 編集済み' : ''}
          </span>
          <button type="button" className="edit-toggle" onClick={onToggleEdit}>
            <Icon name="edit" size={11} />
            {editing ? '編集を終了' : '編集'}
          </button>
        </div>
        {editing ? (
          <textarea
            className="draft-body"
            value={body}
            onChange={(e) => onChangeBody(e.target.value)}
            rows={Math.max(10, body.split('\n').length + 2)}
          />
        ) : (
          <CitedDraftBody
            body={body}
            blocks={draft.citationBlocks}
            activeIndex={activeCitationIndex}
            onSelectCitation={onSelectCitation}
          />
        )}
      </div>
    </div>
  );
}
