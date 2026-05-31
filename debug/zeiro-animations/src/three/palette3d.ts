// sRGB hex equivalents of the brand OKLCH tokens in apps/web/styles/tokens.css.
// Three.js materials parse hex/rgb/hsl but NOT oklch(), so 3D scenes use these.
// Conversion: OKLCH -> OKLab -> linear sRGB -> gamma sRGB (D65).
export const c3 = {
  bg: '#f2eee6',
  bg2: '#ede8de',
  surface: '#fbf9f4',
  surface2: '#f7f4ed',
  paper: '#ffffff',

  ink: '#14110d',
  ink2: '#3a352d',
  inkSoft: '#5a5248',
  muted: '#7a7268',
  muted2: '#9a9286',
  line: '#e2dccf',
  lineStrong: '#cfc8b8',

  accent: '#314936',
  accentInk: '#15301b',
  accentSoft: '#d9eadc',
  accentBright: '#3b834e',
  accentGlow: '#5cb572',
  positive: '#236436',
  urgent: '#c13234',

  catDeadline: '#a06f30',
  catDocs: '#2f6868',
  catTax: '#9a504b',
  catContract: '#594c7d',
} as const;

// Convenience groupings for category-coded objects.
export const categoryColors = [c3.catTax, c3.catDocs, c3.catDeadline, c3.catContract] as const;
