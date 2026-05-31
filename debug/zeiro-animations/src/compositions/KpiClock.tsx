import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { Background } from '../common/Background';
import { fonts } from '../fonts';
import { ease, palette } from '../theme';

// A clock-face whose hour & minute hands unwind backwards while accumulated
// "minutes saved" pile up below as floating chips that stack into a tower.
const TOTAL_MINUTES = 187; // saved this week
const STACK_CHIPS = 28; // visual chips, each = ~6.7 min

export const KpiClock: React.FC = () => {
  const frame = useCurrentFrame();

  const headerIn = interpolate(frame, [0, 24], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(...ease.brand),
  });

  const unwind = interpolate(frame, [20, 180], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(...ease.editorial),
  });

  const counterMinutes = Math.floor(unwind * TOTAL_MINUTES);
  // Hands rotate backward as time is reclaimed.
  const hourRot = -unwind * 360 * 3.1;
  const minRot = -unwind * 360 * 38;

  return (
    <AbsoluteFill>
      <Background />

      <div style={{ position: 'absolute', top: 96, left: 120, opacity: headerIn }}>
        <div
          style={{
            fontFamily: fonts.mono,
            fontSize: 13,
            color: palette.muted,
            letterSpacing: '0.4em',
            textTransform: 'uppercase',
            marginBottom: 10,
          }}
        >
          time reclaimed · this week
        </div>
        <div
          style={{
            fontFamily: fonts.jp,
            fontSize: 52,
            color: palette.ink,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            lineHeight: 1.1,
          }}
        >
          時計を、少しだけ巻き戻す。
        </div>
      </div>

      {/* Clock */}
      <div
        style={{
          position: 'absolute',
          left: 280,
          top: 360,
          width: 440,
          height: 440,
        }}
      >
        <ClockFace />
        <Hand length={120} width={6} angle={hourRot} color={palette.ink} />
        <Hand length={170} width={3} angle={minRot} color={palette.accent} />
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: 16,
            height: 16,
            marginLeft: -8,
            marginTop: -8,
            borderRadius: '50%',
            backgroundColor: palette.ink,
          }}
        />
      </div>

      {/* Counter and chip tower on right */}
      <div
        style={{
          position: 'absolute',
          right: 160,
          top: 320,
          width: 600,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
        }}
      >
        <div
          style={{
            fontFamily: fonts.sans,
            fontSize: 260,
            fontWeight: 600,
            color: palette.accent,
            letterSpacing: '-0.05em',
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {counterMinutes}
          <span style={{ fontSize: 80, color: palette.muted, marginLeft: 8 }}>min</span>
        </div>
        <div
          style={{
            fontFamily: fonts.jp,
            fontSize: 20,
            color: palette.muted,
            marginTop: 8,
            letterSpacing: '0.04em',
          }}
        >
          今週、Zeiro が肩代わりした作業時間
        </div>

        {/* Chip stack */}
        <div
          style={{
            position: 'relative',
            marginTop: 28,
            width: 480,
            height: 220,
          }}
        >
          {Array.from({ length: STACK_CHIPS }).map((_, i) => {
            const showAt = 20 + i * 5;
            const t = interpolate(frame, [showAt, showAt + 18], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
              easing: Easing.bezier(...ease.brand),
            });
            const col = i % 7;
            const row = Math.floor(i / 7);
            const x = col * 60 + (row % 2 === 0 ? 0 : 6);
            const y = 200 - row * 30;
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: x,
                  top: y,
                  width: 54,
                  height: 22,
                  backgroundColor: palette.accent,
                  borderRadius: 4,
                  opacity: t * 0.85,
                  transform: `translateY(${(1 - t) * -40}px) scaleY(${0.6 + 0.4 * t})`,
                  boxShadow: '0 2px 6px rgba(11, 78, 50, 0.15)',
                }}
              />
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const ClockFace: React.FC = () => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      borderRadius: '50%',
      backgroundColor: palette.surface,
      border: `8px solid ${palette.ink}`,
      boxShadow: 'inset 0 4px 12px rgba(20,17,13,0.06)',
    }}
  >
    {Array.from({ length: 12 }).map((_, i) => {
      const angle = (i / 12) * 360;
      const isQuarter = i % 3 === 0;
      return (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: isQuarter ? 4 : 2,
            height: isQuarter ? 22 : 12,
            marginLeft: isQuarter ? -2 : -1,
            backgroundColor: palette.ink,
            transformOrigin: '50% calc(220px - 8px)',
            transform: `rotate(${angle}deg) translateY(calc(-220px + 16px))`,
          }}
        />
      );
    })}
  </div>
);

const Hand: React.FC<{ length: number; width: number; angle: number; color: string }> = ({
  length,
  width,
  angle,
  color,
}) => (
  <div
    style={{
      position: 'absolute',
      left: '50%',
      top: '50%',
      width,
      height: length,
      marginLeft: -width / 2,
      marginTop: -length,
      backgroundColor: color,
      borderRadius: width,
      transformOrigin: `${width / 2}px ${length}px`,
      transform: `rotate(${angle}deg)`,
    }}
  />
);
