import { extractEmailText } from '@zeiro/email';
import type { Extraction } from '../types';

// UTF-8 is dominant for modern files; older Japanese sources occasionally come
// in Shift-JIS or EUC-JP. We try UTF-8 first and only fall back to detection
// if the decode produced the U+FFFD replacement character — most legitimate
// modern files never trip the fallback.
export function extractText(buffer: Buffer, kind: 'text' | 'markdown' = 'text'): Extraction {
  const text = decodeBestEffort(buffer);
  return { text, kind, warnings: [], meta: {} };
}

export async function extractEmail(buffer: Buffer): Promise<Extraction> {
  const text = await extractEmailText(decodeBestEffort(buffer));
  return { text, kind: 'email', warnings: [], meta: {} };
}

function decodeBestEffort(buffer: Buffer): string {
  const utf8 = buffer.toString('utf-8');
  if (!utf8.includes('�')) return utf8;
  // The Node built-in TextDecoder supports Shift_JIS and EUC-JP — handy for
  // legacy 税理士事務所 archives exported from Windows-only software.
  for (const enc of ['shift_jis', 'euc-jp']) {
    try {
      const decoder = new TextDecoder(enc, { fatal: false });
      const decoded = decoder.decode(buffer);
      if (!decoded.includes('�')) return decoded;
    } catch {
      // decoder not available; carry on
    }
  }
  return utf8;
}
