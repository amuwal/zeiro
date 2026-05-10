/* global React, CATEGORIES, Icon */
const { useState: useStateAn, useEffect: useEffectAn } = React;

function CountUp({ to, decimals = 0, suffix = "", duration = 900 }) {
  const [v, setV] = useStateAn(0);
  useEffectAn(() => {
    const start = performance.now();
    let raf;
    const tick = (t) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(to * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return <>{v.toFixed(decimals)}{suffix}</>;
}

function Sparkline({ values, color = "var(--accent)" }) {
  const w = 60, h = 24;
  const max = Math.max(...values), min = Math.min(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg className="kpi-spark" viewBox={`0 0 ${w} ${h}`}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AnalyticsTab() {
  const kpis = [
    { lbl: "エスカレーション率", val: 31.4, decimals: 1, unit: "%", target: "目標 32%", delta: "-0.6%", up: false, good: true, bar: 31.4, sparkColor: "var(--accent)", spark: [38, 35, 36, 34, 33, 32, 31] },
    { lbl: "下書き採用率", val: 67, unit: "%", target: "目標 60%", delta: "+4.2%", up: true, good: true, bar: 67, sparkColor: "oklch(45% 0.10 150)", spark: [58, 60, 61, 64, 63, 65, 67] },
    { lbl: "平均一次対応時間", val: 2.4, decimals: 1, unit: "分", target: "目標 3分以下", delta: "-22%", up: false, good: true, bar: 80, sparkColor: "var(--accent)", spark: [4.1, 3.5, 3.0, 2.8, 2.6, 2.5, 2.4] },
    { lbl: "今月の工数削減", val: 142, unit: "h", target: "目標 100h", delta: "+18h", up: true, good: true, bar: 100, sparkColor: "oklch(45% 0.10 150)", spark: [88, 95, 110, 118, 125, 138, 142] },
  ];

  const cats = [
    { ...CATEGORIES.deadline, count: 38, pct: 38 },
    { ...CATEGORIES.docs,     count: 27, pct: 27 },
    { ...CATEGORIES.tax,      count: 18, pct: 18 },
    { ...CATEGORIES.contract, count: 9,  pct: 9  },
    { ...CATEGORIES.other,    count: 8,  pct: 8  },
  ];

  return (
    <div className="an-pane anim-stagger">
      <div className="an-head">
        <div>
          <div className="an-title">パフォーマンス</div>
          <div className="kb-sub">2026年5月 · 全担当・全顧問先</div>
        </div>
        <div className="an-period">
          <button>今日</button>
          <button>7日</button>
          <button className="active">30日</button>
          <button>四半期</button>
        </div>
      </div>

      <div className="kpi-grid">
        {kpis.map(k => (
          <div className="kpi" key={k.lbl}>
            <div className="kpi-lbl">{k.lbl}</div>
            <Sparkline values={k.spark} color={k.sparkColor} />
            <div className="kpi-val">
              <CountUp to={k.val} decimals={k.decimals || 0} />
              <span className="unit">{k.unit}</span>
            </div>
            <div className="kpi-bar-wrap">
              <i style={{ width: `${k.bar}%` }} />
              {k.lbl === "エスカレーション率" && <span className="target" style={{ left: "32%" }} />}
            </div>
            <div className="kpi-foot">
              <span className="kpi-target">{k.target}</span>
              <span className={`kpi-delta ${k.up ? "up" : "down"}`} style={{ color: k.good ? "oklch(45% 0.10 150)" : "var(--urgent)" }}>
                {k.up ? "↗" : "↘"} {k.delta}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="an-grid">
        <div className="chart-card">
          <div className="chart-head">
            <div>
              <div className="chart-title">カテゴリ別 問い合わせ分布</div>
              <div className="chart-sub">過去30日 · 計 {cats.reduce((a, c) => a + c.count, 0)}件</div>
            </div>
            <div className="kb-sub" style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>UPDATED 10:42 JST</div>
          </div>
          <div className="cat-bar">
            {cats.map(c => (
              <div className="cat-bar-row" key={c.id}>
                <div className="name">
                  <span className="swatch" style={{ background: c.color }} />
                  {c.jp}
                </div>
                <div className="track">
                  <i style={{ width: `${(c.count / 38) * 100}%`, background: c.color }} />
                </div>
                <div className="pct">{c.count}件 · {c.pct}%</div>
              </div>
            ))}
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-head">
            <div>
              <div className="chart-title">監査・コンプライアンス</div>
              <div className="chart-sub">直近の重要イベント</div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { ico: "shield", title: "テナント分離テスト", sub: "5/8 自動実行 · 通過", status: "ok" },
              { ico: "doc", title: "監査ログ整合性チェック", sub: "5/9 03:00 · 全件一致", status: "ok" },
              { ico: "alert", title: "マイナンバー検出（マスク済）", sub: "本日 3件 · 自動マスキング", status: "ok" },
              { ico: "flag", title: "法改正フラグ更新", sub: "kb-006 強制レビュー対象に変更", status: "warn" },
            ].map((it, i) => (
              <div key={i} style={{
                display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 10, alignItems: "center",
                padding: "10px 12px", background: "var(--surface-2)", borderRadius: 8,
                border: "1px solid var(--line)",
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: it.status === "ok" ? "oklch(94% 0.03 150)" : "oklch(95% 0.04 70)",
                  color: it.status === "ok" ? "oklch(38% 0.06 150)" : "oklch(45% 0.10 70)",
                  display: "grid", placeItems: "center",
                }}>
                  <Icon name={it.ico} size={13} />
                </div>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 500 }}>{it.title}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--font-mono)" }}>{it.sub}</div>
                </div>
                <Icon name="check" size={13} stroke={2} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

window.AnalyticsTab = AnalyticsTab;
