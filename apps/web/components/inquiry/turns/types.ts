export type TurnAuthor = { name: string; role: string; initials: string };
export type Attachment = { name: string; size: string };
export type DraftBlock = { text: string; cite: string | null };

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

export type CiteProps = {
  highlightedCite: string | null;
  onCiteHover: (id: string) => void;
  onCiteLeave: () => void;
};
