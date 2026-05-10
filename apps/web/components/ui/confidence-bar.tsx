export function ConfidenceBar({ score }: { score: number }) {
  const level = score >= 0.85 ? '' : score >= 0.7 ? 'med' : 'low';
  return (
    <div className={`confidence-bar ${level}`}>
      <i style={{ width: `${score * 100}%` }} />
    </div>
  );
}
