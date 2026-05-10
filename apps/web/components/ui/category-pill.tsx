import { getCategoryTheme } from '@zeiro/core';

export function CategoryPill({ category }: { category: string }) {
  const theme = getCategoryTheme(category);
  return (
    <span className="cat-pill" style={{ background: theme.soft, color: theme.color }}>
      <span className="swatch" style={{ background: theme.color }} />
      {theme.jp}
    </span>
  );
}

export function CategoryTag({ category }: { category: string }) {
  const theme = getCategoryTheme(category);
  return (
    <span className="detail-tag">
      <span className="swatch" style={{ background: theme.color }} />
      {theme.jp}
    </span>
  );
}

export function CategoryStripe({ category }: { category: string }) {
  const theme = getCategoryTheme(category);
  return <span className="item-cat" style={{ background: theme.color }} />;
}
