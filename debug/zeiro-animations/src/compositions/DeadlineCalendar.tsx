import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { Background } from "../common/Background";
import { fonts } from "../fonts";
import { ease, palette, radius, shadow } from "../theme";

// A 5-week calendar grid. Initial state: many red overdue dots scattered.
// As animation progresses, dots flip from red → green in waves, accompanied
// by a counter that ticks up.

const WEEKS = 5;
const DAYS = 7;
const TOTAL = WEEKS * DAYS;

const WEEKDAYS = ["月", "火", "水", "木", "金", "土", "日"];

// Deterministic seed: which cells start as overdue (red).
const seedAt = (i: number) => {
  const x = Math.sin(i * 41.119) * 23.456;
  return x - Math.floor(x);
};

const RESOLVED_ORDER = Array.from({ length: TOTAL }, (_, i) => i).sort((a, b) => seedAt(a + 7) - seedAt(b + 7));

export const DeadlineCalendar: React.FC = () => {
  const frame = useCurrentFrame();

  const headerIn = interpolate(frame, [0, 24], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(...ease.brand),
  });

  const flipProgress = interpolate(frame, [30, 180], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(...ease.editorial),
  });

  // Cells that are overdue at all (about 60% of cells).
  const overdueSet = new Set<number>();
  for (let i = 0; i < TOTAL; i++) {
    if (seedAt(i) < 0.55) overdueSet.add(i);
  }
  const totalOverdue = overdueSet.size;
  const flippedCount = Math.floor(flipProgress * totalOverdue);

  // Determine which cells have been flipped — take from RESOLVED_ORDER but only count overdue cells.
  const flippedSet = new Set<number>();
  let taken = 0;
  for (const i of RESOLVED_ORDER) {
    if (taken >= flippedCount) break;
    if (overdueSet.has(i)) {
      flippedSet.add(i);
      taken++;
    }
  }

  const cellSize = 88;
  const gap = 14;
  const gridW = DAYS * cellSize + (DAYS - 1) * gap;
  const gridH = WEEKS * cellSize + (WEEKS - 1) * gap;

  const counterT = interpolate(frame, [30, 180], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(...ease.editorial),
  });
  const resolvedNum = Math.floor(counterT * totalOverdue);

  return (
    <AbsoluteFill>
      <Background />

      <Header opacity={headerIn} />

      <div
        style={{
          position: "absolute",
          left: 120,
          top: 320,
        }}
      >
        {/* Weekday labels */}
        <div style={{ display: "flex", gap, marginBottom: 16 }}>
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              style={{
                width: cellSize,
                textAlign: "center",
                fontFamily: fonts.jp,
                fontSize: 16,
                color: palette.muted,
                letterSpacing: "0.05em",
              }}
            >
              {d}
            </div>
          ))}
        </div>

        <div style={{ position: "relative", width: gridW, height: gridH }}>
          {Array.from({ length: TOTAL }).map((_, i) => {
            const col = i % DAYS;
            const row = Math.floor(i / DAYS);
            const overdue = overdueSet.has(i);
            const flipped = flippedSet.has(i);
            return (
              <CalendarCell
                key={i}
                x={col * (cellSize + gap)}
                y={row * (cellSize + gap)}
                size={cellSize}
                day={i + 1}
                overdue={overdue}
                flipped={flipped}
              />
            );
          })}
        </div>
      </div>

      {/* Counters on the right */}
      <div
        style={{
          position: "absolute",
          right: 140,
          top: 320,
          width: 460,
          display: "flex",
          flexDirection: "column",
          gap: 28,
        }}
      >
        <Counter
          label="期限超過 → 解消"
          before={totalOverdue}
          after={resolvedNum}
          accent
        />
        <Counter
          label="残り 期限超過"
          before={totalOverdue}
          after={totalOverdue - resolvedNum}
        />
        <div
          style={{
            opacity: counterT,
            backgroundColor: palette.surface,
            border: `1px solid ${palette.line}`,
            borderRadius: radius.md,
            padding: "18px 22px",
            boxShadow: shadow.sm,
            marginTop: 12,
          }}
        >
          <div
            style={{
              fontFamily: fonts.mono,
              fontSize: 12,
              color: palette.muted,
              letterSpacing: "0.32em",
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            What Zeiro did
          </div>
          <div style={{ fontFamily: fonts.jp, fontSize: 18, color: palette.ink }}>
            自動で督促 / 進捗確認 / 必要書類の代筆依頼
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const CalendarCell: React.FC<{
  x: number;
  y: number;
  size: number;
  day: number;
  overdue: boolean;
  flipped: boolean;
}> = ({ x, y, size, day, overdue, flipped }) => {
  const showState = overdue ? (flipped ? "resolved" : "overdue") : "normal";
  const bg =
    showState === "resolved"
      ? palette.accentSoft
      : showState === "overdue"
        ? "oklch(96% 0.04 25)"
        : palette.surface;
  const dotColor =
    showState === "resolved"
      ? palette.accent
      : showState === "overdue"
        ? palette.urgent
        : "transparent";
  const border =
    showState === "resolved"
      ? `1px solid ${palette.accent}`
      : showState === "overdue"
        ? `1px solid ${palette.urgent}`
        : `1px solid ${palette.line}`;

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: size,
        height: size,
        borderRadius: radius.sm,
        backgroundColor: bg,
        border,
        padding: 10,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div
        style={{
          fontFamily: fonts.mono,
          fontSize: 12,
          color: palette.muted,
        }}
      >
        {day}
      </div>
      <div
        style={{
          width: 10,
          height: 10,
          borderRadius: 10,
          backgroundColor: dotColor,
          alignSelf: "flex-end",
        }}
      />
    </div>
  );
};

const Counter: React.FC<{
  label: string;
  before: number;
  after: number;
  accent?: boolean;
}> = ({ label, before, after, accent }) => (
  <div>
    <div
      style={{
        fontFamily: fonts.mono,
        fontSize: 12,
        color: palette.muted,
        letterSpacing: "0.32em",
        textTransform: "uppercase",
        marginBottom: 8,
      }}
    >
      {label}
    </div>
    <div
      style={{
        fontFamily: fonts.sans,
        fontSize: 90,
        fontWeight: 600,
        color: accent ? palette.accent : palette.ink,
        letterSpacing: "-0.03em",
        lineHeight: 1,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {after}
      <span style={{ fontSize: 28, color: palette.muted, marginLeft: 8 }}>/ {before}</span>
    </div>
  </div>
);

const Header: React.FC<{ opacity: number }> = ({ opacity }) => (
  <div
    style={{
      position: "absolute",
      top: 96,
      left: 120,
      opacity,
      maxWidth: 1200,
    }}
  >
    <div
      style={{
        fontFamily: fonts.mono,
        fontSize: 13,
        color: palette.muted,
        letterSpacing: "0.4em",
        textTransform: "uppercase",
        marginBottom: 12,
      }}
    >
      backlog · 11 月の期限
    </div>
    <div
      style={{
        fontFamily: fonts.jp,
        fontSize: 52,
        color: palette.ink,
        fontWeight: 700,
        letterSpacing: "-0.02em",
        lineHeight: 1.05,
      }}
    >
      赤い日が、<span style={{ color: palette.accent }}>緑</span>に変わるまで。
    </div>
  </div>
);
