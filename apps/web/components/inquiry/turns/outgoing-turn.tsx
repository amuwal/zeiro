import { Icon } from '@/components/ui/icon';
import type { Turn } from './types';

export function OutgoingTurn({ turn }: { turn: Extract<Turn, { kind: 'outgoing' }> }) {
  return (
    <article className="turn agent outgoing">
      <div className="turn-marker">{turn.who.initials}</div>
      <div className="turn-content">
        <header className="turn-head">
          <span className="who">{turn.who.name}</span>
          <span className="role">{turn.who.role}</span>
          <span className="badge">
            <Icon name="check" size={9} /> 送信済
          </span>
          <span className="time">{turn.time}</span>
        </header>
        <div className="turn-msg">{turn.body}</div>
        {turn.sentVia && (
          <div className="ai-note">
            <span className="ai-note-glyph">
              <Icon name="spark" size={11} />
            </span>
            <span>
              <em>{turn.sentVia}</em>
            </span>
          </div>
        )}
      </div>
    </article>
  );
}
