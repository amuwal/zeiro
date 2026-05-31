const MY_NUMBER_PATTERN = /\b\d{4}[ -]?\d{4}[ -]?\d{4}\b/g;
const MY_NUMBER_MASK = '[マイナンバー]';

const EMAIL_PATTERN = /([A-Za-z0-9._%+-]+)@([A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;
const JP_PHONE_PATTERN = /\b0\d{1,4}-\d{1,4}-\d{4}\b/g;

// The web -> agents firm token is `<base64url>.<base64url>` (HMAC payload.sig,
// see security/firm-token.ts). It can leak into a thrown Error's message (e.g.
// an upstream 401 body echoing the header) or a Bearer authorization string.
// Names/email/phone aside, the TOKEN shape IS regex-matchable, so scrub it
// wherever it appears in free text — header form, Bearer form, and bare.
const FIRM_TOKEN_LABELLED_PATTERN = /(x-zeiro-firm-token|authorization|bearer)([=:]\s*|\s+)\S+/gi;
const BARE_FIRM_TOKEN_PATTERN = /\b[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}\b/g;
const TOKEN_MASK = '[token]';

// Free-text field names that carry a client/company/person name. Names are NOT
// regex-detectable (税理士法 §38 lists them as never-log), so any value under
// these keys is dropped wholesale rather than pattern-masked.
const NAME_KEYS = new Set([
  'name',
  'clientname',
  'companyname',
  'sendername',
  'from',
  'to',
  'replyto',
]);

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
    .replace(FIRM_TOKEN_LABELLED_PATTERN, (_m, label: string) => `${label}=${TOKEN_MASK}`)
    .replace(BARE_FIRM_TOKEN_PATTERN, TOKEN_MASK)
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

// Edge/client-safe recursive key drop. Names can't be regex-masked, so any value
// under a name-bearing key is removed entirely. Used by the Sentry scrub paths
// (which run in Node but import from the package index, so this must stay free of
// node:* deps). The Node logger has its own, broader `dropSensitiveKeysDeep` in
// the logger subpath covering body/subject/auth secrets as well.
export function redactNamesDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactNamesDeep);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([k]) => !NAME_KEYS.has(k.toLowerCase()))
        .map(([k, v]) => [k, redactNamesDeep(v)]),
    );
  }
  return value;
}

// Single-pass edge/client-safe deep scrub for the Sentry boundary: drop
// name-bearing keys, then PII-mask remaining string values (email/phone/My
// Number/token). Accepts any JSON-ish value, returns the same shape scrubbed.
export function scrubPIIDeep(value: unknown): unknown {
  return redactPIIDeep(redactNamesDeep(value));
}
