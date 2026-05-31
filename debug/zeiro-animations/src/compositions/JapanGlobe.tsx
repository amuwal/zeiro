import { ThreeCanvas } from '@remotion/three';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { Background } from '../common/Background';
import { fonts } from '../fonts';
import { ease, palette } from '../theme';
import { Lights } from '../three/rig';
import { Arcs, Core, Globe, Nodes, Stars } from './JapanGlobeScene';

export const JapanGlobe: React.FC = () => {
  const { width, height } = useVideoConfig();
  const frame = useCurrentFrame();

  const appear = interpolate(frame, [0, 50], [0.32, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(...ease.brand),
  });

  // Sweep the node cluster from off-axis toward the camera, then hold.
  const rotY = interpolate(frame, [0, 180, 300], [-0.95, 0.05, 0.16], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(...ease.editorial),
  });

  return (
    <AbsoluteFill>
      <Background variant="ink" />
      <ThreeCanvas
        width={width}
        height={height}
        camera={{ position: [0, 2, 7], fov: 35 }}
        gl={{ alpha: true, antialias: true }}
        style={{ position: 'absolute', inset: 0 }}
      >
        <Lights shadows={false} intensity={0.85} keyPosition={[5, 8, 9]} />
        <Stars />
        <group rotation={[0.14, 0, 0]}>
          <group rotation={[0, rotY, 0]}>
            <Globe appear={appear} />
            <Nodes frame={frame} />
            <Arcs frame={frame} />
          </group>
          <Core frame={frame} appear={appear} />
        </group>
      </ThreeCanvas>

      <Overlays frame={frame} />
    </AbsoluteFill>
  );
};

const Overlays: React.FC<{ frame: number }> = ({ frame }) => {
  const fade = (a: number, b: number) =>
    interpolate(frame, [a, b], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.bezier(...ease.brand),
    });
  const lift = (t: number) => `translateY(${(1 - t) * 16}px)`;

  const eyebrowIn = fade(0, 26);
  const headlineIn = fade(16, 52);
  const subIn = fade(40, 76);
  const footerIn = fade(230, 270);
  const coreLabelIn = fade(70, 110);
  const settle = interpolate(frame, [260, 300], [1, 1]);

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {/* Top-left header block */}
      <div style={{ position: 'absolute', top: 120, left: 120, maxWidth: 1000 }}>
        <div
          style={{
            fontFamily: fonts.mono,
            fontSize: 14,
            color: palette.muted2,
            letterSpacing: '0.4em',
            textTransform: 'uppercase',
            opacity: eyebrowIn,
            transform: lift(eyebrowIn),
            whiteSpace: 'nowrap',
          }}
        >
          NATIONWIDE · 47 都道府県
        </div>
        <div
          style={{
            fontFamily: fonts.jp,
            fontSize: 56,
            fontWeight: 700,
            color: palette.bg,
            letterSpacing: '-0.02em',
            lineHeight: 1.15,
            marginTop: 22,
            opacity: headlineIn,
            transform: lift(headlineIn),
            whiteSpace: 'nowrap',
          }}
        >
          この国の、すべての事務所へ。
        </div>
        <div
          style={{
            fontFamily: fonts.jp,
            fontSize: 22,
            fontWeight: 400,
            color: palette.muted2,
            letterSpacing: '0.01em',
            marginTop: 18,
            opacity: subIn,
            transform: lift(subIn),
            whiteSpace: 'nowrap',
          }}
        >
          日本の税務に最適化された AI エージェント。
        </div>
      </div>

      {/* Core label near the elevated core (upper-center) */}
      <div
        style={{
          position: 'absolute',
          top: 318,
          left: '50%',
          transform: `translateX(-50%) ${lift(coreLabelIn)}`,
          textAlign: 'center',
          opacity: coreLabelIn * settle,
        }}
      >
        <div
          style={{
            fontFamily: fonts.mono,
            fontSize: 18,
            fontWeight: 700,
            color: palette.bg,
            letterSpacing: '0.46em',
            textShadow: '0 0 18px rgba(92,181,114,0.55)',
            whiteSpace: 'nowrap',
          }}
        >
          ZEIRO
        </div>
        <div
          style={{
            fontFamily: fonts.mono,
            fontSize: 10,
            color: palette.accentSoft,
            letterSpacing: '0.34em',
            textTransform: 'uppercase',
            marginTop: 6,
            whiteSpace: 'nowrap',
          }}
        >
          central core
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          position: 'absolute',
          bottom: 80,
          left: 120,
          right: 120,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          opacity: footerIn,
        }}
      >
        <div
          style={{
            fontFamily: fonts.mono,
            fontSize: 13,
            color: palette.muted2,
            letterSpacing: '0.32em',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
          }}
        >
          data residency · jp-tokyo · made in 東京
        </div>
        <div
          style={{
            fontFamily: fonts.mono,
            fontSize: 13,
            color: palette.muted,
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
          }}
        >
          zeiro · 税理士事務所
        </div>
      </div>
    </AbsoluteFill>
  );
};
