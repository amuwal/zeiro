import { simpleParser } from 'mailparser';

export async function extractEmailText(rawMime: string): Promise<string> {
  const parsed = await simpleParser(rawMime);
  const text = typeof parsed.text === 'string' ? parsed.text : null;
  const html = typeof parsed.html === 'string' ? parsed.html : null;
  return text ?? html ?? '';
}
