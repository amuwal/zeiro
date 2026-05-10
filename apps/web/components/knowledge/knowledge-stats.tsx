type Props = {
  total: number;
  fresh: number;
  review: number;
  outdated: number;
};

export function KnowledgeStats({ total, fresh, review, outdated }: Props) {
  const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100));
  return (
    <div className="kb-stats">
      <Stat label="総件数" value={total} sub="+12 今月" subClass="up" />
      <Stat label="最新" value={fresh} sub={`${pct(fresh)}%`} color="oklch(38% 0.06 150)" />
      <Stat label="要確認" value={review} sub="所内レビュー待ち" color="oklch(45% 0.10 70)" />
      <Stat label="法改正影響" value={outdated} sub="強制レビュー対象" color="var(--urgent)" />
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  subClass,
  color,
}: {
  label: string;
  value: number;
  sub: string;
  subClass?: string;
  color?: string;
}) {
  return (
    <div className="kb-stat">
      <span className="lbl">{label}</span>
      <span className="num" style={color ? { color } : undefined}>{value}</span>
      <span className={`delta ${subClass ?? ''}`}>{sub}</span>
    </div>
  );
}
