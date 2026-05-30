import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { Background } from "../common/Background";
import { fonts } from "../fonts";
import { ease, palette, radius, shadow } from "../theme";

// Before / After split. Left side: jagged slow response curve. Right side: smooth fast.
// A vertical seam wipes from left to right revealing the "after".
export const KpiCompare: React.FC = () => {
  const frame = useCurrentFrame();

  const headerIn = interpolate(frame, [0, 24], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(...ease.brand),
  });

  // Curtain pulls from the right edge inward to the centre, revealing "after" on the right half.
  const reveal = interpolate(frame, [30, 130], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(...ease.editorial),
  });

  const numIn = interpolate(frame, [130, 170], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(...ease.brand),
  });

  const cw = 1920;
  const ch = 1080;
  const seamX = cw - reveal * (cw / 2); // 1920 → 960

  return (
    <AbsoluteFill>
      {/* Background "before" (whole canvas) */}
      <Background variant="surface" />
      <ChartBefore />
      <BeforeOverlay opacity={headerIn} />

      {/* "After" revealed via clip-path on the right side */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          clipPath: `polygon(${seamX}px 0, ${cw}px 0, ${cw}px ${ch}px, ${seamX}px ${ch}px)`,
        }}
      >
        <Background />
        <ChartAfter />
        <AfterOverlay opacity={headerIn} numIn={numIn} />
      </div>

      {/* Seam line */}
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: seamX - 1,
          width: 2,
          backgroundColor: palette.accent,
          boxShadow: `0 0 24px 4px ${palette.accentSoft}`,
        }}
      />
    </AbsoluteFill>
  );
};

// Each chart is the same set of points; before is jagged and slow, after smooth and steep.
const BEFORE_POINTS = [0.12, 0.18, 0.16, 0.28, 0.22, 0.38, 0.36, 0.5, 0.46, 0.62];
const AFTER_POINTS = [0.08, 0.16, 0.25, 0.36, 0.48, 0.58, 0.68, 0.76, 0.83, 0.9];

const ChartBefore: React.FC = () => (
  <Chart
    points={BEFORE_POINTS}
    color={palette.muted}
    label="従来"
    badgeColor={palette.muted}
    side="left"
  />
);

const ChartAfter: React.FC = () => (
  <Chart
    points={AFTER_POINTS}
    color={palette.accent}
    label="Zeiro 導入後"
    badgeColor={palette.accent}
    side="right"
  />
);

const Chart: React.FC<{
  points: number[];
  color: string;
  label: string;
  badgeColor: string;
  side: "left" | "right";
}> = ({ points, color, label, badgeColor, side }) => {
  const left = side === "left" ? 200 : 1000;
  const top = 460;
  const w = 720;
  const h = 360;
  const stepX = w / (points.length - 1);
  const d = points
    .map((y, i) => `${i === 0 ? "M" : "L"} ${i * stepX} ${h - y * h}`)
    .join(" ");

  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        width: w,
        height: h + 80,
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          fontFamily: fonts.mono,
          fontSize: 12,
          color: badgeColor,
          letterSpacing: "0.32em",
          textTransform: "uppercase",
          padding: "6px 12px",
          border: `1px solid ${badgeColor}`,
          borderRadius: 999,
          marginBottom: 20,
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: 6, backgroundColor: badgeColor }} />
        {label}
      </div>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        {/* grid */}
        {[0.25, 0.5, 0.75].map((g) => (
          <line key={g} x1={0} x2={w} y1={h - g * h} y2={h - g * h} stroke={palette.line} strokeWidth={1} />
        ))}
        <path d={d} stroke={color} strokeWidth={4} fill="none" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((y, i) => (
          <circle key={i} cx={i * stepX} cy={h - y * h} r={5} fill={color} />
        ))}
      </svg>
    </div>
  );
};

const BeforeOverlay: React.FC<{ opacity: number }> = ({ opacity }) => (
  <div
    style={{
      position: "absolute",
      top: 96,
      left: 120,
      opacity,
      maxWidth: 700,
    }}
  >
    <div
      style={{
        fontFamily: fonts.mono,
        fontSize: 13,
        color: palette.muted,
        letterSpacing: "0.4em",
        textTransform: "uppercase",
        marginBottom: 10,
      }}
    >
      before · 平均応答 6 時間 12 分
    </div>
    <div
      style={{
        fontFamily: fonts.jp,
        fontSize: 56,
        color: palette.ink,
        fontWeight: 700,
        letterSpacing: "-0.02em",
        lineHeight: 1.05,
      }}
    >
      返信が、追いつかない。
    </div>
  </div>
);

const AfterOverlay: React.FC<{ opacity: number; numIn: number }> = ({ opacity, numIn }) => (
  <div
    style={{
      position: "absolute",
      top: 96,
      right: 120,
      opacity,
      maxWidth: 760,
      textAlign: "right",
    }}
  >
    <div
      style={{
        fontFamily: fonts.mono,
        fontSize: 13,
        color: palette.accent,
        letterSpacing: "0.4em",
        textTransform: "uppercase",
        marginBottom: 10,
      }}
    >
      after · 平均 11 分
    </div>
    <div
      style={{
        fontFamily: fonts.jp,
        fontSize: 46,
        color: palette.ink,
        fontWeight: 700,
        letterSpacing: "-0.02em",
        lineHeight: 1.1,
      }}
    >
      33<span style={{ color: palette.accent }}>×</span> 速く、<br />
      その日のうちに返す。
    </div>
    <div
      style={{
        opacity: numIn,
        marginTop: 24,
        display: "inline-block",
        padding: "10px 22px",
        borderRadius: radius.sm,
        backgroundColor: palette.accentSoft,
        color: palette.accentInk,
        fontFamily: fonts.mono,
        fontSize: 14,
        letterSpacing: "0.2em",
        textTransform: "uppercase",
        boxShadow: shadow.sm,
      }}
    >
      pilot · 12 firms · n = 4,108
    </div>
  </div>
);
