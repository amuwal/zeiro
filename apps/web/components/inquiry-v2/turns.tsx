'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/icon';

export type Turn =
  | { kind: 'incoming'; who: TurnAuthor; time: string; body: string; attachments?: Attachment[] }
  | { kind: 'outgoing'; who: TurnAuthor; time: string; body: string; sentVia?: string }
  | {
      kind: 'draft';
      who: TurnAuthor;
      time: string;
      version: number;
      aiNote?: string;
      blocks: DraftBlock[];
      citationCount: number;
      confidence: number;
      generatedMs?: number;
      model?: string;
      isFresh?: boolean;
    };

export type TurnAuthor = { name: string; role: string; initials: string };
export type Attachment = { name: string; size: string };
export type DraftBlock = { text: string; cite: string | null };

type Props = {
  turn: Turn;
  highlightedCite: string | null;
  onCiteHover: (id: string) => void;
  onCiteLeave: () => void;
};

export function TurnView({ turn, highlightedCite, onCiteHover, onCiteLeave }: Props) {
  if (turn.kind === 'incoming') return <IncomingTurn turn={turn} />;
  if (turn.kind === 'outgoing') return <OutgoingTurn turn={turn} />;
  return (
    <DraftTurn
      turn={turn}
      highlightedCite={highlightedCite}
      onCiteHover={onCiteHover}
      onCiteLeave={onCiteLeave}
    />
  );
}

function IncomingTurn({ turn }: { turn: Extract<Turn, { kind: 'incoming' }> }) {
  return (
    <article className="turn incoming">
      <div className="turn-marker">{turn.who.initials}</div>
      <div className="turn-content">
        <header className="turn-head">
          <span className="who">{turn.who.name}</span>
          <span className="role">{turn.who.role}</span>
          <span className="time">{turn.time}</span>
        </header>
        <div className="turn-msg">{turn.body}</div>
        {turn.attachments && turn.attachments.length > 0 && (
          <div className="attach-row">
            {turn.attachments.map((a, i) => (
              <span key={i} className="attach-chip">
                <span className="ico"><Icon name="paperclip" size={12} /></span>
                {a.name}
                <span className="size">{a.size}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

function OutgoingTurn({ turn }: { turn: Extract<Turn, { kind: 'outgoing' }> }) {
  return (
    <article className="turn agent outgoing">
      <div className="turn-marker">{turn.who.initials}</div>
      <div className="turn-content">
        <header className="turn-head">
          <span className="who">{turn.who.name}</span>
          <span className="role">{turn.who.role}</span>
          <span className="badge"><Icon name="check" size={9} /> 送信済</span>
          <span className="time">{turn.time}</span>
        </header>
        <div className="turn-msg">{turn.body}</div>
        {turn.sentVia && (
          <div className="ai-note">
            <span className="ai-note-glyph"><Icon name="spark" size={11} /></span>
            <span><em>{turn.sentVia}</em></span>
          </div>
        )}
      </div>
    </article>
  );
}

function DraftTurn({
  turn,
  highlightedCite,
  onCiteHover,
  onCiteLeave,
}: {
  turn: Extract<Turn, { kind: 'draft' }>;
  highlightedCite: string | null;
  onCiteHover: (id: string) => void;
  onCiteLeave: () => void;
}) {
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

function DraftBlocksView({
  blocks,
  highlightedCite,
  onCiteHover,
  onCiteLeave,
  typing,
}: {
  blocks: DraftBlock[];
  highlightedCite: string | null;
  onCiteHover: (id: string) => void;
  onCiteLeave: () => void;
  typing: boolean;
}) {
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
