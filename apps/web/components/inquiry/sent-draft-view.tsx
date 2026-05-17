import { Icon } from '@/components/ui/icon';
import type { DraftView } from './draft-composer';

/** Read-only view shown in place of the editable composer once the inquiry's
 * draft has been sent. Locks the body so it can't be edited (mutations would
 * never reach the customer anyway, and editable text on a "sent" state would
 * be confusing). */
export function SentDraftView({ draft }: { draft: DraftView | null }) {
  return (
    <div className="draft-composer">
      <div className="draft-composer-strip">
        <span className="mini-stat ok">
          <Icon name="check" size={11} /> 送信済
        </span>
        <span className="strip-divider" />
        <span className="mini-stat">{(draft?.model ?? 'CLAUDE-4.5').toUpperCase()}</span>
        <span className="gen-time">{draft?.time ?? '—'}</span>
      </div>
      <div className="draft-editor draft-editor-locked">{draft?.body ?? ''}</div>
      <div className="composer-meta">
        <div className="group">
          <span className="item">
            <Icon name="check" size={11} /> 顧問先へ送信されました
          </span>
        </div>
        <span className="item">顧客が返信すると新規問い合わせとして取り込まれます</span>
      </div>
    </div>
  );
}
