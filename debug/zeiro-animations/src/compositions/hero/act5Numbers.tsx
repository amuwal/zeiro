import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { fonts } from '../../fonts';
import { ease, palette } from '../../theme';

const TARGET_EMAILS = 1247;
const TARGET_HOURS = 14.2;

export const Act5Numbers: React.FC = () => {
  const frame = useCurrentFrame();

  const countT = interpolate(frame, [0, 70], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(...ease.brand),
  });
  const tagIn = interpolate(frame, [55, 95], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(...ease.brand),
  });

  return (
    <AbsoluteFill
      style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 18 }}
    >
      <div
        style={{
          fontFamily: fonts.mono,
          fontSize: 14,
          color: palette.muted,
          letterSpacing: '0.4em',
          textTransform: 'uppercase',
          opacity: countT,
        }}
      >
        last 7 days · pilot · 12 firms
      </div>

      <div
        style={{
          display: 'flex',
          gap: 120,
          alignItems: 'baseline',
        }}
      >
        <BigNumber
          value={Math.floor(countT * TARGET_EMAILS).toLocaleString()}
          unit="件"
          label="返信した"
        />
        <Divider />
        <BigNumber value={(countT * TARGET_HOURS).toFixed(1)} unit="h" label="取り戻した" accent />
      </div>

      <div
        style={{
          fontFamily: fonts.jp,
          fontSize: 28,
          color: palette.ink2,
          letterSpacing: '-0.005em',
          marginTop: 32,
          opacity: tagIn,
          transform: `translateY(${(1 - tagIn) * 12}px)`,
        }}
      >
        その時間を、お客様との会話に。
      </div>
    </AbsoluteFill>
  );
};

const BigNumber: React.FC<{ value: string; unit: string; label: string; accent?: boolean }> = ({
  value,
  unit,
  label,
  accent,
}) => (
  <div style={{ textAlign: 'center' }}>
    <div
      style={{
        fontFamily: fonts.sans,
        fontSize: 240,
        fontWeight: 600,
        color: accent ? palette.accent : palette.ink,
        letterSpacing: '-0.045em',
        lineHeight: 1,
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {value}
      <span style={{ fontSize: 72, color: palette.muted, marginLeft: 10 }}>{unit}</span>
    </div>
    <div
      style={{
        fontFamily: fonts.jp,
        fontSize: 18,
        color: palette.muted,
        marginTop: 12,
        letterSpacing: '0.08em',
      }}
    >
      {label}
    </div>
  </div>
);

const Divider: React.FC = () => (
  <div style={{ width: 2, height: 220, backgroundColor: palette.line, alignSelf: 'center' }} />
);
