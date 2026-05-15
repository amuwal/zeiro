type ConfidenceDialProps = { value: number };

const RADIUS = 90;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function ConfidenceDial({ value }: ConfidenceDialProps) {
  const offset = CIRCUMFERENCE * (1 - value);
  return (
    <div className="conf-dial">
      <svg viewBox="0 0 200 200">
        <circle className="track" cx="100" cy="100" r={RADIUS} />
        <circle
          className="fill"
          cx="100"
          cy="100"
          r={RADIUS}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="center">
        <div className="v">
          {Math.round(value * 100)}
          <span className="unit">%</span>
        </div>
        <div className="l">Confidence</div>
      </div>
    </div>
  );
}
