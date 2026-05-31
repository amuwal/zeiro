import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { Background } from '../common/Background';
import { fonts } from '../fonts';
import { ease, palette } from '../theme';

// Five shapes converge on the centre to form the wordmark, then the type cross-fades in.
// The geometry quotes Bauhaus / Saul Bass: pure rect, line, circle.
type Shape = {
  kind: 'rect' | 'circle' | 'line';
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  w: number;
  h: number;
  color: string;
  delay: number;
};

const SHAPES: Shape[] = [
  {
    kind: 'rect',
    fromX: -800,
    fromY: -200,
    toX: -260,
    toY: 0,
    w: 56,
    h: 220,
    color: 'oklch(52% 0.1 25)',
    delay: 0,
  },
  {
    kind: 'circle',
    fromX: 600,
    fromY: -400,
    toX: -120,
    toY: 0,
    w: 220,
    h: 220,
    color: 'oklch(48% 0.06 195)',
    delay: 4,
  },
  {
    kind: 'rect',
    fromX: -400,
    fromY: 600,
    toX: 20,
    toY: 0,
    w: 56,
    h: 220,
    color: 'oklch(58% 0.1 70)',
    delay: 8,
  },
  {
    kind: 'line',
    fromX: 800,
    fromY: 200,
    toX: 140,
    toY: -70,
    w: 240,
    h: 8,
    color: palette.ink,
    delay: 12,
  },
  {
    kind: 'rect',
    fromX: 0,
    fromY: -600,
    toX: 220,
    toY: 0,
    w: 56,
    h: 220,
    color: 'oklch(45% 0.08 295)',
    delay: 16,
  },
];

export const LogoGeometric: React.FC = () => {
  const frame = useCurrentFrame();

  const typeReveal = interpolate(frame, [55, 85], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(...ease.crisp),
  });

  const stripIn = interpolate(frame, [95, 125], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(...ease.brand),
  });

  const dissolve = interpolate(frame, [45, 75], [1, 0.25], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(...ease.editorial),
  });

  return (
    <AbsoluteFill>
      <Background />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'relative', width: 720, height: 360 }}>
          {SHAPES.map((s, i) => {
            const t = interpolate(frame, [s.delay, s.delay + 28], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
              easing: Easing.bezier(...ease.brand),
            });
            const x = s.fromX + (s.toX - s.fromX) * t;
            const y = s.fromY + (s.toY - s.fromY) * t;
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: `calc(50% + ${x}px - ${s.w / 2}px)`,
                  top: `calc(50% + ${y}px - ${s.h / 2}px)`,
                  width: s.w,
                  height: s.h,
                  backgroundColor: s.color,
                  borderRadius: s.kind === 'circle' ? '50%' : 0,
                  opacity: t * dissolve,
                  transform: `scale(${0.6 + 0.4 * t})`,
                  transformOrigin: 'center',
                }}
              />
            );
          })}

          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: fonts.sans,
              fontSize: 220,
              fontWeight: 700,
              letterSpacing: '-0.045em',
              color: palette.ink,
              opacity: typeReveal,
              lineHeight: 1,
              transform: `translateY(${(1 - typeReveal) * 8}px)`,
            }}
          >
            ZEIRO
          </div>
        </div>

        <div
          style={{
            marginTop: 12,
            opacity: stripIn,
            transform: `translateY(${(1 - stripIn) * 10}px)`,
            fontFamily: fonts.jp,
            color: palette.muted,
            fontSize: 24,
            letterSpacing: '0.22em',
          }}
        >
          形あるものから、形あるものへ
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
