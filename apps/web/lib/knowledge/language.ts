import { franc } from 'franc-min';

// Map franc's ISO-639-3 codes back to the 2-letter codes the rest of the
// pipeline uses ('ja' for Japanese, 'en' for English, etc.). `franc-min`
// covers ~80 languages — enough for any document a 税理士事務所 might field.
const ISO_3_TO_2: Record<string, string> = {
  jpn: 'ja',
  eng: 'en',
  cmn: 'zh',
  kor: 'ko',
  fra: 'fr',
  deu: 'de',
  spa: 'es',
  por: 'pt',
  ita: 'it',
  rus: 'ru',
  tha: 'th',
  vie: 'vi',
  ind: 'id',
};

export type Language = 'ja' | 'en' | 'zh' | 'ko' | 'unknown' | (string & {});

// Detection on documents below this length is unreliable — franc needs ~50
// characters of meaningful text to be confident. Below the threshold we
// return 'unknown' and let the chunker pick its generic fallback.
const MIN_TEXT_FOR_DETECTION = 50;

export function detectLanguage(text: string): Language {
  if (text.length < MIN_TEXT_FOR_DETECTION) return 'unknown';
  // `only` would let us pre-filter but at this stage we let franc roam — the
  // pipeline can still chunk a Korean or Chinese 通達 archive sensibly.
  const code = franc(text);
  if (code === 'und') return 'unknown';
  return ISO_3_TO_2[code] ?? code;
}
