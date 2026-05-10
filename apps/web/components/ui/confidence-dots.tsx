export function ConfidenceDots({ score }: { score: number }) {
  const filled = score >= 0.85 ? 4 : score >= 0.7 ? 3 : score >= 0.5 ? 2 : 1;
  const cls = score < 0.7 ? 'confidence low' : 'confidence';
  return (
    <span className={cls}>
      <span className="conf-dots">
        {[0, 1, 2, 3].map((i) => (
          <i key={i} className={i < filled ? 'on' : ''} />
        ))}
      </span>
      {Math.round(score * 100)}
    </span>
  );
}
