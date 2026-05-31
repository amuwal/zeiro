import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { Background } from '../common/Background';
import { fonts } from '../fonts';
import { ease, palette } from '../theme';

// A swarm of small dots (each = one email) flies in from a turbulent cloud,
// then resolves into a perfect grid — pure "data → order" visual.
const COLS = 24;
const ROWS = 16;
const TOTAL = COLS * ROWS;

const CATEGORY_COLORS = [
  palette.catTax,
  palette.catDocs,
  palette.catDeadline,
  palette.catContract,
  palette.muted,
];

const seedAt = (i: number) => {
  // deterministic pseudo-random
  const x = Math.sin(i * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

export const InboxParticles: React.FC = () => {
  const frame = useCurrentFrame();

  const gridIn = interpolate(frame, [40, 100], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(...ease.brand),
  });

  const labelIn = interpolate(frame, [110, 145], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(...ease.crisp),
  });

  const gridSize = 18;
  const gap = 8;
  const gridW = COLS * gridSize + (COLS - 1) * gap;
  const gridH = ROWS * gridSize + (ROWS - 1) * gap;

  return (
    <AbsoluteFill>
      <Background />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'relative', width: gridW, height: gridH }}>
          {Array.from({ length: TOTAL }).map((_, i) => {
            const col = i % COLS;
            const row = Math.floor(i / COLS);
            const r1 = seedAt(i);
            const r2 = seedAt(i + 999);
            const r3 = seedAt(i + 2002);
            const delay = Math.floor(r1 * 30);
            const t = interpolate(frame, [delay, delay + 50], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
              easing: Easing.bezier(...ease.brand),
            });

            const orderX = col * (gridSize + gap);
            const orderY = row * (gridSize + gap);

            const chaosX = orderX + (r2 - 0.5) * 1200;
            const chaosY = orderY + (r3 - 0.5) * 800;

            const x = chaosX + (orderX - chaosX) * t * gridIn;
            const y = chaosY + (orderY - chaosY) * t * gridIn;

            const color = CATEGORY_COLORS[i % CATEGORY_COLORS.length];

            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: x,
                  top: y,
                  width: gridSize,
                  height: gridSize,
                  backgroundColor: color,
                  borderRadius: 4,
                  opacity: t,
                  transform: `scale(${0.4 + 0.6 * t})`,
                }}
              />
            );
          })}
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: 110,
            left: 0,
            right: 0,
            textAlign: 'center',
            opacity: labelIn,
            transform: `translateY(${(1 - labelIn) * 14}px)`,
          }}
        >
          <div
            style={{
              fontFamily: fonts.mono,
              fontSize: 13,
              color: palette.muted,
              letterSpacing: '0.32em',
              textTransform: 'uppercase',
              marginBottom: 10,
            }}
          >
            {TOTAL.toLocaleString()} messages · 5 categories · 1 inbox
          </div>
          <div
            style={{
              fontFamily: fonts.jp,
              fontSize: 36,
              color: palette.ink,
              fontWeight: 600,
              letterSpacing: '-0.01em',
            }}
          >
            すべての問い合わせを、ひとつの秩序に。
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
