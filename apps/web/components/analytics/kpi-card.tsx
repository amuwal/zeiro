import { Sparkline } from './sparkline';

export type KpiInput = {
  label: string;
  value: number;
  decimals?: number;
  unit: string;
  target: string;
  delta: string;
  deltaUp: boolean;
  good: boolean;
  barPct: number;
  targetMarkerPct?: number;
  spark: number[];
  sparkColor?: string;
};

export function KpiCard(k: KpiInput) {
  const decimals = k.decimals ?? 0;
  const formatted = k.value.toFixed(decimals);
  const deltaColor = k.good ? 'var(--positive)' : 'var(--urgent)';
  return (
    <div className="kpi">
      <div className="kpi-lbl">{k.label}</div>
      <Sparkline values={k.spark} color={k.sparkColor} />
      <div className="kpi-val">
        {formatted}
        <span className="unit">{k.unit}</span>
      </div>
      <div className="kpi-bar-wrap">
        <i style={{ width: `${k.barPct}%` }} />
        {k.targetMarkerPct !== undefined && (
          <span className="target" style={{ left: `${k.targetMarkerPct}%` }} />
        )}
      </div>
      <div className="kpi-foot">
        <span className="kpi-target">{k.target}</span>
        <span className={`kpi-delta ${k.deltaUp ? 'up' : 'down'}`} style={{ color: deltaColor }}>
          {k.deltaUp ? '↗' : '↘'} {k.delta}
        </span>
      </div>
    </div>
  );
}
