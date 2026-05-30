import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { Background } from "../common/Background";
import { fonts } from "../fonts";
import { ease, palette, radius } from "../theme";

const DAYS = [
  { day: "月", hoursSavedAfter: 1.2 },
  { day: "火", hoursSavedAfter: 2.4 },
  { day: "水", hoursSavedAfter: 3.0 },
  { day: "木", hoursSavedAfter: 2.1 },
  { day: "金", hoursSavedAfter: 4.0 },
  { day: "土", hoursSavedAfter: 1.0 },
  { day: "日", hoursSavedAfter: 0.5 },
];

const MAX_HOURS = 5;
const TARGET_EMAILS = 1247;
const TARGET_HOURS = DAYS.reduce((a, b) => a + b.hoursSavedAfter, 0);

export const KpiCounter: React.FC = () => {
  const frame = useCurrentFrame();

  const headerIn = interpolate(frame, [0, 24], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(...ease.brand),
  });

  const counterT = interpolate(frame, [30, 110], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(...ease.brand),
  });
  const emailCount = Math.floor(counterT * TARGET_EMAILS);
  const hourCount = (counterT * TARGET_HOURS).toFixed(1);

  return (
    <AbsoluteFill>
      <Background />

      <div style={{ position: "absolute", inset: "100px 120px" }}>
        <div style={{ opacity: headerIn, transform: `translateY(${(1 - headerIn) * 12}px)` }}>
          <div
            style={{
              fontFamily: fonts.mono,
              fontSize: 13,
              color: palette.muted,
              letterSpacing: "0.32em",
              textTransform: "uppercase",
              marginBottom: 14,
            }}
          >
            this week · 2026-05-23 → 2026-05-29
          </div>
          <div
            style={{
              fontFamily: fonts.jp,
              fontSize: 52,
              color: palette.ink,
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            返した数。<span style={{ color: palette.accent }}>取り戻した時間。</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 64, marginTop: 56, alignItems: "flex-end" }}>
          <BigStat label="件 返信" value={emailCount.toLocaleString()} />
          <BigStat label="時間 取り戻した" value={`${hourCount} h`} accent />
        </div>

        <BarChart frame={frame} />
      </div>
    </AbsoluteFill>
  );
};

const BigStat: React.FC<{ label: string; value: string; accent?: boolean }> = ({
  label,
  value,
  accent,
}) => (
  <div>
    <div
      style={{
        fontFamily: fonts.sans,
        fontSize: 180,
        fontWeight: 600,
        letterSpacing: "-0.045em",
        color: accent ? palette.accent : palette.ink,
        lineHeight: 1,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {value}
    </div>
    <div
      style={{
        fontFamily: fonts.jp,
        fontSize: 18,
        color: palette.muted,
        marginTop: 8,
        letterSpacing: "0.05em",
      }}
    >
      {label}
    </div>
  </div>
);

const BarChart: React.FC<{ frame: number }> = ({ frame }) => {
  const barAreaW = 1280;
  const barAreaH = 220;
  const barWidth = 80;
  const gap = (barAreaW - barWidth * DAYS.length) / (DAYS.length + 1);
  const chartT = interpolate(frame, [80, 170], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(...ease.brand),
  });

  return (
    <div
      style={{
        marginTop: 80,
        width: barAreaW,
        height: barAreaH,
        position: "relative",
        borderTop: `1px solid ${palette.line}`,
      }}
    >
      {DAYS.map((d, i) => {
        const startDelay = 80 + i * 6;
        const tBar = interpolate(frame, [startDelay, startDelay + 32], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(...ease.brand),
        });
        const h = (d.hoursSavedAfter / MAX_HOURS) * barAreaH * tBar;
        return (
          <div
            key={d.day}
            style={{
              position: "absolute",
              bottom: 32,
              left: gap + i * (barWidth + gap),
              width: barWidth,
              height: h,
              backgroundColor: i === 4 ? palette.accent : palette.lineStrong,
              borderRadius: `${radius.sm}px ${radius.sm}px 0 0`,
              opacity: chartT,
            }}
          >
            <div
              style={{
                position: "absolute",
                top: -28,
                left: 0,
                right: 0,
                textAlign: "center",
                fontFamily: fonts.mono,
                fontSize: 13,
                color: i === 4 ? palette.accent : palette.muted,
                opacity: tBar,
              }}
            >
              {d.hoursSavedAfter.toFixed(1)}h
            </div>
            <div
              style={{
                position: "absolute",
                bottom: -28,
                left: 0,
                right: 0,
                textAlign: "center",
                fontFamily: fonts.jp,
                fontSize: 16,
                color: palette.muted,
              }}
            >
              {d.day}
            </div>
          </div>
        );
      })}
    </div>
  );
};
