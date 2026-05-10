import { simpleParser } from 'mailparser';

export async function extractEmailText(rawMime: string): Promise<string> {
  const parsed = await simpleParser(rawMime);
  return parsed.text ?? parsed.html ?? '';
}
