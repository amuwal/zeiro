export const CONFIDENCE_NO_CITATION = 0.3;
export const CONFIDENCE_FLOOR_WITH_CITATION = 0.55;
export const CONFIDENCE_PER_CITATION_STEP = 0.15;
export const CONFIDENCE_CAP = 0.85;
export const CONFIDENCE_CAP_CITATION_COUNT = 3;

export function confidenceFromCitations(count: number): number {
  if (count === 0) return CONFIDENCE_NO_CITATION;
  if (count >= CONFIDENCE_CAP_CITATION_COUNT) return CONFIDENCE_CAP;
  return CONFIDENCE_FLOOR_WITH_CITATION + (count - 1) * CONFIDENCE_PER_CITATION_STEP;
}
