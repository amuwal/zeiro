import { getCategoryTheme } from '@zeiro/core';
import type { CategoryDistribution as Row } from '@/lib/analytics';

export function CategoryDistribution({ rows }: { rows: Row[] }) {
  const total = rows.reduce((a, b) => a + b.count, 0);
  const max = rows.reduce((m, r) => Math.max(m, r.count), 1);
  return (
    <div className="chart-card">
      <div className="chart-head">
        <div>
          <div className="chart-title">カテゴリ別 問い合わせ分布</div>
          <div className="chart-sub">過去30日 · 計 {total}件</div>
        </div>
      </div>
      <div className="cat-bar">
        {rows.map((r) => {
          const theme = getCategoryTheme(r.category);
          const widthPct = (r.count / max) * 100;
          return (
            <div key={r.category} className="cat-bar-row">
              <div className="name">
                <span className="swatch" style={{ background: theme.color }} />
                {r.category}
              </div>
              <div className="track">
                <i style={{ width: `${widthPct}%`, background: theme.color }} />
              </div>
              <div className="pct">
                {r.count}件 · {r.pct}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
