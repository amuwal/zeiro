// Centralised pdfjs configuration so every code path that opens a PDF — the
// text extractor, the OCR renderer, the password probe — points pdfjs at the
// CJK character maps and the standard fonts. Without these, Japanese PDFs
// extract with warnings (and very occasionally with degraded glyph coverage).
//
// In a plain Node process `require.resolve('pdfjs-dist/...')` returns a real
// filesystem path. Inside the Next.js / Turbopack runtime the resolver
// returns a virtual `[project]/node_modules/…` path that isn't a valid URL —
// so we try to build the asset URLs and silently drop them on failure rather
// than killing the extract step. The pipeline keeps working without cmaps;
// font warnings get emitted but text still extracts.

import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);

export type PdfjsOptions = {
  cMapUrl?: string;
  cMapPacked: boolean;
  standardFontDataUrl?: string;
  isEvalSupported: boolean;
};

export function pdfjsOptions(): PdfjsOptions {
  const opts: PdfjsOptions = { cMapPacked: true, isEvalSupported: false };
  const root = resolvePdfjsRoot();
  if (!root) return opts;
  const cmaps = assetUrl(root, 'cmaps');
  if (cmaps) opts.cMapUrl = cmaps;
  const fonts = assetUrl(root, 'standard_fonts');
  if (fonts) opts.standardFontDataUrl = fonts;
  return opts;
}

function resolvePdfjsRoot(): string | null {
  // Prefer require.resolve so pnpm's nested layout works. Fall back to
  // walking up from cwd if the resolver returns a non-path (the Turbopack
  // case).
  try {
    const entry = require.resolve('pdfjs-dist/package.json');
    if (existsSync(entry)) return dirname(entry);
  } catch {
    // ignore — try the cwd-walk path
  }
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    const candidate = join(dir, 'node_modules', 'pdfjs-dist', 'package.json');
    if (existsSync(candidate)) return dirname(candidate);
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function assetUrl(root: string, subpath: string): string | undefined {
  const dir = join(root, subpath);
  if (!existsSync(dir)) return undefined;
  return `${pathToFileURL(dir).toString()}/`;
}
