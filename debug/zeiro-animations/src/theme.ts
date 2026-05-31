// Brand tokens lifted from apps/web/styles/tokens.css.
export const palette = {
  bg: '#f2eee6',
  bg2: '#ede8de',
  surface: '#fbf9f4',
  surface2: '#f7f4ed',
  ink: '#14110d',
  ink2: '#3a352d',
  muted: '#7a7268',
  muted2: '#9a9286',
  line: '#e2dccf',
  lineStrong: '#cfc8b8',

  accent: 'oklch(38% 0.045 150)',
  accentSoft: 'oklch(92% 0.025 150)',
  accentInk: 'oklch(28% 0.05 150)',

  catDeadline: 'oklch(58% 0.1 70)',
  catDeadlineSoft: 'oklch(94% 0.04 70)',
  catDocs: 'oklch(48% 0.06 195)',
  catDocsSoft: 'oklch(94% 0.025 195)',
  catTax: 'oklch(52% 0.1 25)',
  catTaxSoft: 'oklch(94% 0.035 25)',
  catContract: 'oklch(45% 0.08 295)',
  catContractSoft: 'oklch(94% 0.03 295)',

  urgent: 'oklch(54% 0.18 25)',
  positive: 'oklch(45% 0.1 150)',
};

export const radius = { sm: 6, md: 10, lg: 14 };

export const shadow = {
  sm: '0 1px 0 rgba(20, 17, 13, 0.04)',
  md: '0 1px 2px rgba(20, 17, 13, 0.04), 0 8px 24px -16px rgba(20, 17, 13, 0.12)',
  lg: '0 2px 4px rgba(20, 17, 13, 0.04), 0 24px 48px -24px rgba(20, 17, 13, 0.18)',
};

export const ease = {
  // CSS cubic-bezier params, ready for Easing.bezier(...)
  brand: [0.22, 1, 0.36, 1] as const, // signature ease-out
  inOut: [0.65, 0, 0.35, 1] as const,
  crisp: [0.16, 1, 0.3, 1] as const, // UI entrance
  editorial: [0.45, 0, 0.55, 1] as const,
  pop: [0.34, 1.56, 0.64, 1] as const, // gentle overshoot
};
