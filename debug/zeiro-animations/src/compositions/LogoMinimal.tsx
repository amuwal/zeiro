import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { Background } from '../common/Background';
import { fonts } from '../fonts';
import { ease, palette } from '../theme';

const LETTERS = 'ZEIRO'.split('');

export const LogoMinimal: React.FC = () => {
  const frame = useCurrentFrame();

  const lineProgress = interpolate(frame, [10, 50], [0, 1], {
    extrapolateRight: 'clamp',
    extrapolateLeft: 'clamp',
    easing: Easing.bezier(...ease.brand),
  });

  const tagOpacity = interpolate(frame, [70, 100], [0, 1], {
    extrapolateRight: 'clamp',
    extrapolateLeft: 'clamp',
    easing: Easing.bezier(...ease.crisp),
  });

  const tagShift = interpolate(frame, [70, 100], [10, 0], {
    extrapolateRight: 'clamp',
    extrapolateLeft: 'clamp',
    easing: Easing.bezier(...ease.crisp),
  });

  const perLetterIn = 8;
  const perLetterStagger = 5;

  return (
    <AbsoluteFill>
      <Background />
      <AbsoluteFill
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 24,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', overflow: 'hidden' }}>
          {LETTERS.map((letter, i) => {
            const start = 6 + i * perLetterStagger;
            const t = interpolate(frame, [start, start + perLetterIn], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
              easing: Easing.bezier(...ease.brand),
            });
            const y = (1 - t) * 120;
            const opacity = t;
            return (
              <span
                key={`${letter}-${i}`}
                style={{
                  fontFamily: fonts.sans,
                  fontSize: 220,
                  fontWeight: 600,
                  letterSpacing: '-0.045em',
                  color: palette.ink,
                  display: 'inline-block',
                  transform: `translateY(${y}px)`,
                  opacity,
                  lineHeight: 1,
                }}
              >
                {letter}
              </span>
            );
          })}
        </div>

        <div
          style={{
            position: 'relative',
            width: 720,
            height: 4,
            backgroundColor: palette.line,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: palette.accent,
              transformOrigin: 'left center',
              transform: `scaleX(${lineProgress})`,
            }}
          />
        </div>

        <div
          style={{
            opacity: tagOpacity,
            transform: `translateY(${tagShift}px)`,
            fontFamily: fonts.jp,
            color: palette.muted,
            fontSize: 28,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
          }}
        >
          税理士事務所のための AI エージェント
        </div>

        <div
          style={{
            opacity: tagOpacity,
            fontFamily: fonts.mono,
            color: palette.muted2,
            fontSize: 14,
            letterSpacing: '0.32em',
            textTransform: 'uppercase',
            marginTop: 4,
          }}
        >
          ai · trust · time
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
