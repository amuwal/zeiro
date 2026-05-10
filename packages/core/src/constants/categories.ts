import { z } from 'zod';

export const CATEGORIES = ['期日確認', '書類提出', '税務質問', '顧問契約', 'その他'] as const;
export type Category = (typeof CATEGORIES)[number];
export const categoryEnum = z.enum(CATEGORIES);
