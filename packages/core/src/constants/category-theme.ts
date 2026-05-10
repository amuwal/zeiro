import type { Category } from './categories';

export type CategoryTheme = {
  id: 'deadline' | 'docs' | 'tax' | 'contract' | 'other';
  jp: Category;
  color: string;
  soft: string;
};

export const CATEGORY_THEME: Record<Category, CategoryTheme> = {
  期日確認: {
    id: 'deadline',
    jp: '期日確認',
    color: 'var(--cat-deadline)',
    soft: 'var(--cat-deadline-soft)',
  },
  書類提出: { id: 'docs', jp: '書類提出', color: 'var(--cat-docs)', soft: 'var(--cat-docs-soft)' },
  税務質問: { id: 'tax', jp: '税務質問', color: 'var(--cat-tax)', soft: 'var(--cat-tax-soft)' },
  顧問契約: {
    id: 'contract',
    jp: '顧問契約',
    color: 'var(--cat-contract)',
    soft: 'var(--cat-contract-soft)',
  },
  その他: { id: 'other', jp: 'その他', color: 'var(--cat-other)', soft: 'var(--cat-other-soft)' },
};

export function getCategoryTheme(category: string): CategoryTheme {
  return CATEGORY_THEME[category as Category] ?? CATEGORY_THEME.その他;
}
