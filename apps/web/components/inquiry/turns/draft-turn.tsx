import { Icon } from '@/components/ui/icon';
import { DraftBlocksView } from './draft-blocks';
import type { CiteProps, Turn } from './types';

type Props = CiteProps & {
  turn: Extract<Turn, { kind: 'draft' }>;
};

export function DraftTurn({ turn, highlightedCite, onCiteHover, onCiteLeave }: Props) {
  return (
    <article className="turn draft">
      <div className="turn-marker">{turn.who.initials}</div>
      <div className="turn-content">
        <header className="turn-head">
          <span className="who">{turn.who.name}</span>
          <span className="role">{turn.who.role}</span>
          <span className="badge">DRAFT · v{turn.version}</span>
          <span className="time">{turn.time}</span>
        </header>

        {turn.aiNote && (
          <div className="ai-note">
            <span className="ai-note-glyph"><Icon name="spark" size={11} /></span>
            <span>{turn.aiNote}</span>
          </div>
        )}

        <div className="draft-card">
          <div className="draft-strip">
            <span className="mini-stat"><b>{turn.citationCount}</b> KB参照</span>
            <span className="strip-divider" />
            <span className="mini-stat">信頼度 <b>{Math.round(turn.confidence * 100)}%</b></span>
            <span className="strip-divider" />
            <span className="mini-stat">{(turn.model ?? 'CLAUDE-4.5').toUpperCase()}</span>
            <span className="gen-time">
              {turn.generatedMs ? `${turn.generatedMs}ms · ` : ''}
              {turn.time}
            </span>
          </div>

          <DraftBlocksView
            blocks={turn.blocks}
            highlightedCite={highlightedCite}
            onCiteHover={onCiteHover}
            onCiteLeave={onCiteLeave}
            typing={turn.isFresh ?? false}
          />

          <div className="draft-actions">
            <button type="button" className="btn btn-ghost">
              <Icon name="edit" size={12} /> 編集
            </button>
            <button type="button" className="btn btn-ghost">
              <Icon name="spark" size={12} /> 再生成
            </button>
            <span className="spacer" />
            <span className="note">⌘↵ で送信</span>
            <button type="button" className="btn btn-secondary">
              <Icon name="x" size={12} /> 却下
            </button>
            <button type="button" className="btn btn-primary">
              <Icon name="send" size={12} /> そのまま送信
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
