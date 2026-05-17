import { DraftTurn } from './draft-turn';
import { IncomingTurn } from './incoming-turn';
import { OutgoingTurn } from './outgoing-turn';
import type { CiteProps, Turn } from './types';

export type { Attachment, CiteProps, DraftBlock, Turn, TurnAuthor } from './types';

type Props = CiteProps & {
  turn: Turn;
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
