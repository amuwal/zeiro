type Props = {
  total: number;
  monthly: number;
  spot: number;
  prospect: number;
  unverified: number;
};

export function ClientStats({ total, monthly, spot, prospect, unverified }: Props) {
  return (
    <div className="kb-stats">
      <Stat label="TOTAL" value={total} />
      <Stat label="MONTHLY" jp="顧問契約" value={monthly} />
      <Stat label="SPOT" jp="単発" value={spot} />
      <Stat label="PROSPECT" jp="見込み" value={prospect} />
      <Stat label="UNVERIFIED" jp="未確認" value={unverified} />
    </div>
  );
}

function Stat({ label, value, jp }: { label: string; value: number; jp?: string }) {
  return (
    <div className="kb-stat">
      <span className="lbl">{label}</span>
      <span className="num">{value}</span>
      {jp && <span className="delta">{jp}</span>}
    </div>
  );
}
