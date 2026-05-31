import { Icon } from '@/components/ui/icon';
import type { Turn } from './types';

export function IncomingTurn({ turn }: { turn: Extract<Turn, { kind: 'incoming' }> }) {
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
                <span className="ico">
                  <Icon name="paperclip" size={12} />
                </span>
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
