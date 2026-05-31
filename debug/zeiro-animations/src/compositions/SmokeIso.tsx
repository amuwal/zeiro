import { RoundedBox } from '@react-three/drei';
import { ThreeCanvas } from '@remotion/three';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { Background } from '../common/Background';
import { ease } from '../theme';
import { c3 } from '../three/palette3d';
import { Lights, ShadowGround } from '../three/rig';

// Toolchain smoke test: transparent ThreeCanvas over the brand paper Background,
// soft studio rig, drei RoundedBox, contact shadows, frame-driven motion.
export const SmokeIso: React.FC = () => {
  const { width, height } = useVideoConfig();
  const frame = useCurrentFrame();

  const spin = interpolate(frame, [0, 150], [-0.5, 0.4], {
    easing: Easing.bezier(...ease.editorial),
  });
  const rise = (i: number) =>
    interpolate(frame, [i * 7, i * 7 + 32], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.bezier(...ease.brand),
    });

  return (
    <AbsoluteFill>
      <Background variant="cream" />
      <ThreeCanvas
        width={width}
        height={height}
        shadows
        camera={{ position: [9, 8, 11], fov: 30 }}
        gl={{ alpha: true, antialias: true }}
        style={{ position: 'absolute', inset: 0 }}
      >
        <Lights />
        <ShadowGround />
        <group rotation={[0, spin, 0]}>
          {[0, 1, 2, 3].map((i) => (
            <RoundedBox
              key={i}
              args={[3, 0.38, 2.2]}
              radius={0.07}
              smoothness={4}
              position={[0, 0.2 + i * 0.46, 0]}
              scale={[rise(i), rise(i), rise(i)]}
              castShadow
              receiveShadow
            >
              <meshStandardMaterial color={c3.surface} roughness={0.72} metalness={0} />
            </RoundedBox>
          ))}
          <RoundedBox
            args={[1.5, 1.5, 1.5]}
            radius={0.14}
            smoothness={5}
            position={[3.6, 0.95, 0]}
            scale={rise(5)}
            castShadow
          >
            <meshStandardMaterial
              color={c3.accent}
              emissive={c3.accentBright}
              emissiveIntensity={0.4}
              roughness={0.4}
              metalness={0.1}
            />
          </RoundedBox>
        </group>
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
