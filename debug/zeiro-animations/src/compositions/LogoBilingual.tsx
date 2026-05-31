import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { Background } from '../common/Background';
import { fonts } from '../fonts';
import { ease, palette } from '../theme';

export const LogoBilingual: React.FC = () => {
  const frame = useCurrentFrame();

  // The card lives in 3 acts: JP word lands (0-30), flips to EN (40-70), settles + reveals strapline (75-end).
  const jpIn = interpolate(frame, [0, 22], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(...ease.brand),
  });

  const flip = interpolate(frame, [40, 70], [0, 180], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(...ease.editorial),
  });

  const enReveal = interpolate(frame, [55, 75], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(...ease.brand),
  });

  const stripIn = interpolate(frame, [80, 110], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(...ease.crisp),
  });

  return (
    <AbsoluteFill>
      <Background variant="ink" />
      <AbsoluteFill
        style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 40 }}
      >
        <div style={{ perspective: 1400 }}>
          <div
            style={{
              position: 'relative',
              width: 640,
              height: 240,
              transformStyle: 'preserve-3d',
              transform: `rotateX(${flip}deg)`,
            }}
          >
            <FaceJP visible={enReveal < 0.5} jpIn={jpIn} />
            <FaceEN visible={enReveal >= 0.5} enReveal={enReveal} />
          </div>
        </div>

        <div
          style={{
            opacity: stripIn * 0.7,
            transform: `translateY(${(1 - stripIn) * 12}px)`,
            fontFamily: fonts.mono,
            color: palette.bg,
            fontSize: 18,
            letterSpacing: '0.38em',
            textTransform: 'uppercase',
          }}
        >
          for japan's tax professionals
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const FaceJP: React.FC<{ visible: boolean; jpIn: number }> = ({ visible, jpIn }) => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      backfaceVisibility: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      opacity: visible ? 1 : 0,
    }}
  >
    <span
      style={{
        fontFamily: fonts.jp,
        fontWeight: 700,
        fontSize: 200,
        color: palette.bg,
        letterSpacing: '-0.04em',
        transform: `translateY(${(1 - jpIn) * 30}px)`,
        opacity: jpIn,
        lineHeight: 1,
      }}
    >
      税理
    </span>
  </div>
);

const FaceEN: React.FC<{ visible: boolean; enReveal: number }> = ({ visible, enReveal }) => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      backfaceVisibility: 'hidden',
      transform: 'rotateX(180deg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      opacity: visible ? 1 : 0,
    }}
  >
    <span
      style={{
        fontFamily: fonts.sans,
        fontWeight: 600,
        fontSize: 200,
        color: palette.bg,
        letterSpacing: '-0.045em',
        opacity: enReveal,
        lineHeight: 1,
      }}
    >
      ZEIRO
    </span>
  </div>
);
