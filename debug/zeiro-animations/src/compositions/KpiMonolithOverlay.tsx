import { AbsoluteFill, Easing, interpolate } from 'remotion';
import { fonts } from '../fonts';
import { ease } from '../theme';
import { c3 } from '../three/palette3d';

export const beat = (frame: number, a: number, b: number): number =>
  interpolate(frame, [a, b], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(...ease.brand),
  });

export const KpiMonolithOverlay: React.FC<{ frame: number }> = ({ frame }) => {
  const eyebrowIn = beat(frame, 0, 26);
  const numberIn = beat(frame, 162, 192);
  const captionIn = beat(frame, 196, 222);
  const secondaryIn = beat(frame, 208, 234);
  const axisIn = beat(frame, 20, 48);

  const count = Math.round(
    interpolate(frame, [170, 215], [0, 738], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.bezier(...ease.brand),
    }),
  );

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div
        style={{
          position: 'absolute',
          top: 96,
          left: 120,
          opacity: eyebrowIn,
          transform: `translateY(${(1 - eyebrowIn) * 10}px)`,
          fontFamily: fonts.mono,
          fontSize: 14,
          color: c3.muted2,
          letterSpacing: '0.4em',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}
      >
        TIME RECLAIMED · 52 週
      </div>

      <div
        style={{
          position: 'absolute',
          top: 150,
          left: 120,
          opacity: numberIn,
          transform: `translateY(${(1 - numberIn) * 16}px)`,
          display: 'flex',
          alignItems: 'flex-end',
          gap: 8,
        }}
      >
        <span
          style={{
            fontFamily: fonts.sans,
            fontSize: 168,
            fontWeight: 600,
            lineHeight: 0.92,
            letterSpacing: '-0.045em',
            color: c3.accentGlow,
            fontVariantNumeric: 'tabular-nums',
            textShadow: `0 0 48px ${c3.accentBright}55`,
          }}
        >
          {count.toLocaleString()}
        </span>
        <span
          style={{
            fontFamily: fonts.sans,
            fontSize: 64,
            fontWeight: 500,
            color: c3.accentBright,
            marginBottom: 22,
            letterSpacing: '-0.02em',
          }}
        >
          h
        </span>
      </div>

      <div
        style={{
          position: 'absolute',
          top: 336,
          left: 124,
          opacity: captionIn,
          transform: `translateY(${(1 - captionIn) * 10}px)`,
          fontFamily: fonts.jp,
          fontSize: 26,
          fontWeight: 500,
          color: c3.bg,
          letterSpacing: '0.01em',
          whiteSpace: 'nowrap',
        }}
      >
        ／ 年あたり、事務所に返ってきた時間。
      </div>

      <div
        style={{
          position: 'absolute',
          top: 392,
          left: 124,
          opacity: secondaryIn,
          transform: `translateY(${(1 - secondaryIn) * 10}px)`,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ fontFamily: fonts.jp, fontSize: 19, color: c3.muted2 }}>
          返信 1 通あたり
        </span>
        <span
          style={{
            fontFamily: fonts.mono,
            fontSize: 19,
            color: c3.muted,
            textDecoration: 'line-through',
            textDecorationColor: `${c3.urgent}cc`,
          }}
        >
          14.2 分
        </span>
        <span style={{ fontFamily: fonts.mono, fontSize: 18, color: c3.muted }}>→</span>
        <span
          style={{ fontFamily: fonts.mono, fontSize: 20, fontWeight: 700, color: c3.accentGlow }}
        >
          24 秒
        </span>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 84,
          left: 120,
          opacity: axisIn,
          fontFamily: fonts.mono,
          fontSize: 13,
          color: c3.muted,
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}
      >
        週次 · 削減時間 (h)
      </div>
    </AbsoluteFill>
  );
};
