type Analysis = {
  category?: string;
  urgency?: 'high' | 'medium' | 'low';
  confidence?: number;
  reason?: string;
  requiresTaxJudgment?: boolean;
};

type WithAnalysis = { analysis: unknown };

function read(item: WithAnalysis): Analysis {
  const a = item.analysis;
  return a && typeof a === 'object' && !Array.isArray(a) ? (a as Analysis) : {};
}

export function readCategory(item: WithAnalysis): string {
  return read(item).category ?? 'その他';
}

export function readConfidence(item: WithAnalysis): number | null {
  const c = read(item).confidence;
  return typeof c === 'number' ? c : null;
}

export function readUrgent(item: WithAnalysis): boolean {
  return read(item).urgency === 'high';
}

export function readReason(item: WithAnalysis): string | null {
  return read(item).reason ?? null;
}
