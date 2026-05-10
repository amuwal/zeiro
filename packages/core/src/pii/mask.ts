const MY_NUMBER_PATTERN = /\b\d{4}[ -]?\d{4}[ -]?\d{4}\b/g;
const MY_NUMBER_MASK = '[マイナンバー]';

const EMAIL_PATTERN = /([A-Za-z0-9._%+-]+)@([A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;
const JP_PHONE_PATTERN = /\b0\d{1,4}-\d{1,4}-\d{4}\b/g;

export type MaskResult = {
  masked: string;
  redactionCount: number;
};

export function maskMyNumber(text: string): MaskResult {
  let count = 0;
  const masked = text.replace(MY_NUMBER_PATTERN, () => {
    count += 1;
    return MY_NUMBER_MASK;
  });
  return { masked, redactionCount: count };
}

export function redactPII(text: string): string {
  return text
    .replace(MY_NUMBER_PATTERN, MY_NUMBER_MASK)
    .replace(EMAIL_PATTERN, '[email]@$2')
    .replace(JP_PHONE_PATTERN, '[phone]');
}

export function redactPIIDeep(value: unknown): unknown {
  if (typeof value === 'string') return redactPII(value);
  if (Array.isArray(value)) return value.map(redactPIIDeep);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, redactPIIDeep(v)]),
    );
  }
  return value;
}
