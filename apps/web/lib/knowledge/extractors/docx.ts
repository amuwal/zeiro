import mammoth from 'mammoth';
import type { Extraction, ExtractionWarning } from '../types';

// mammoth's HTML mode keeps the structure mammoth-rawtext throws away. We
// post-process the HTML into a clean text+pipe-table form: tables become
// Markdown so the chunker can split on rows, headings keep their level, and
// list bullets survive. This is what the RAG layer actually wants for tabular
// 税理士事務所 docs (給与計算表, 申告期限カレンダー, 法定調書一覧).
export async function extractDocx(buffer: Buffer): Promise<Extraction> {
  const result = await mammoth.convertToHtml({ buffer });
  const html = result.value;
  const warnings: ExtractionWarning[] = [];
  const tableCount = (html.match(/<table/g) ?? []).length;
  const imageCount = (html.match(/<img/g) ?? []).length;
  if (tableCount > 0) warnings.push('tables-dropped');
  if (imageCount > 0) warnings.push('images-dropped');

  const text = htmlToStructuredText(html);
  return {
    text,
    kind: 'docx',
    warnings,
    meta: { tableCount, imageCount },
  };
}

// Walks the HTML mammoth produces and emits text with structural cues:
// headings prefixed by their level, lists with bullet markers, tables as
// pipe-delimited rows. Everything else is just inline text with paragraph
// breaks. We avoid pulling in a full HTML parser — mammoth's output is small
// and regular enough that a tag-walk is reliable.
function htmlToStructuredText(html: string): string {
  let out = html;
  // Tables: replace each <table>…</table> with a Markdown table block.
  out = out.replace(/<table[^>]*>([\s\S]*?)<\/table>/g, (_, body) => renderTable(body));
  // Headings: prefix with #'s so it survives plain-text chunking.
  for (let level = 1; level <= 6; level++) {
    out = out.replace(
      new RegExp(`<h${level}[^>]*>([\\s\\S]*?)<\\/h${level}>`, 'g'),
      (_m, inner) => `\n\n${'#'.repeat(level)} ${stripTags(inner).trim()}\n\n`,
    );
  }
  // Lists: <li> → "・ <content>"; the chunker treats bullets as soft breaks.
  out = out.replace(/<li[^>]*>([\s\S]*?)<\/li>/g, (_m, inner) => `・ ${stripTags(inner).trim()}\n`);
  out = out.replace(/<\/?(ul|ol)[^>]*>/g, '\n');
  // Paragraph & line breaks → newlines.
  out = out.replace(/<\/p>/g, '\n\n');
  out = out.replace(/<br\s*\/?\s*>/g, '\n');
  // Drop remaining tags and decode the few HTML entities that show up.
  out = stripTags(out);
  out = decodeEntities(out);
  // Collapse 3+ newlines to a single blank line; trim each line.
  out = out
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return out;
}

function renderTable(body: string): string {
  const rows: string[][] = [];
  for (const m of body.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
    const tr = m[1] ?? '';
    const cells: string[] = [];
    for (const c of tr.matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g)) {
      cells.push(
        stripTags(c[1] ?? '')
          .trim()
          .replace(/\s+/g, ' '),
      );
    }
    if (cells.length > 0) rows.push(cells);
  }
  if (rows.length === 0) return '';
  const lines: string[] = [];
  const first = rows[0];
  if (!first) return '';
  lines.push(`| ${first.join(' | ')} |`);
  lines.push(`| ${first.map(() => '---').join(' | ')} |`);
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r) continue;
    lines.push(`| ${r.join(' | ')} |`);
  }
  return `\n\n${lines.join('\n')}\n\n`;
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, '');
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}
