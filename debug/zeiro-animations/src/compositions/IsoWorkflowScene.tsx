import { RoundedBox } from '@react-three/drei';
import { Easing, interpolate } from 'remotion';
import { ease } from '../theme';
import { c3 } from '../three/palette3d';
import { Lights, ShadowGround } from '../three/rig';
import { IsoWorkflowSheet } from './IsoWorkflowSheet';

const SHEET_COUNT = 6;
const FIRST_LAUNCH = 36;
const LAUNCH_GAP = 24;
const TRAVEL = 78;

// In-tray sheets that remain (the messy pile), minus the ones that have launched.
const TrayPile: React.FC<{ frame: number; launched: number }> = ({ frame, launched }) => (
  <group position={[-6, 0, 0]}>
    <RoundedBox
      args={[2.6, 0.22, 3.2]}
      radius={0.06}
      smoothness={3}
      position={[0, 0.11, 0]}
      receiveShadow
      castShadow
    >
      <meshStandardMaterial color={c3.surface} roughness={0.78} metalness={0} />
    </RoundedBox>
    {[
      [-1.28, 0.5],
      [1.28, 0.5],
      [-1.28, 0.5],
    ].map((_, i) => (
      <RoundedBox
        key={`w${i}`}
        args={i < 2 ? [0.14, 0.5, 3.2] : [2.6, 0.5, 0.14]}
        radius={0.04}
        smoothness={2}
        position={i < 2 ? [i === 0 ? -1.28 : 1.28, 0.36, 0] : [0, 0.36, -1.6]}
        receiveShadow
        castShadow
      >
        <meshStandardMaterial color={c3.surface2} roughness={0.8} metalness={0} />
      </RoundedBox>
    ))}
    {Array.from({ length: 7 }).map((_, i) => {
      const consumed = i < launched;
      const rise = interpolate(frame, [i * 5, i * 5 + 26], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: Easing.bezier(...ease.brand),
      });
      const tiltX = Math.sin(i * 1.9) * 0.07;
      const tiltZ = Math.cos(i * 2.4) * 0.09;
      const ox = Math.sin(i * 3.1) * 0.22;
      const oz = Math.cos(i * 1.3) * 0.32;
      const s = consumed ? 0 : rise;
      return (
        <RoundedBox
          key={`s${i}`}
          args={[1.6, 0.045, 2.1]}
          radius={0.03}
          smoothness={3}
          position={[ox, 0.26 + i * 0.05, oz]}
          rotation={[tiltX, Math.sin(i) * 0.12, tiltZ]}
          scale={s}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial color={c3.paper} roughness={0.64} metalness={0} />
        </RoundedBox>
      );
    })}
  </group>
);

const Engine: React.FC<{ frame: number; appear: number }> = ({ frame, appear }) => {
  const spin = frame * 0.012;
  const wobble = Math.sin(frame * 0.05) * 0.08;
  const pulse = 0.42 + Math.sin(frame * 0.12) * 0.12;
  return (
    <group position={[0, 0, 0]} scale={appear}>
      <RoundedBox
        args={[2.2, 0.6, 2.2]}
        radius={0.08}
        smoothness={3}
        position={[0, 0.3, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color={c3.ink2} roughness={0.7} metalness={0.1} />
      </RoundedBox>
      <RoundedBox
        args={[1.0, 1.0, 1.0]}
        radius={0.06}
        smoothness={3}
        position={[0, 1.65, 0]}
        rotation={[wobble, spin, spin * 0.5]}
        castShadow
      >
        <meshStandardMaterial
          color={c3.accent}
          emissive={c3.accentBright}
          emissiveIntensity={pulse + 0.1}
          roughness={0.34}
          metalness={0.22}
        />
      </RoundedBox>
      <mesh position={[0, 1.65, 0]} rotation={[wobble, spin * -0.6, 0]} scale={1.55}>
        <icosahedronGeometry args={[0.62, 0]} />
        <meshStandardMaterial
          color={c3.accentGlow}
          emissive={c3.accentGlow}
          emissiveIntensity={pulse}
          wireframe
          transparent
          opacity={0.35}
        />
      </mesh>
      <pointLight position={[0, 1.9, 0]} intensity={1.6} distance={9} color={c3.accentGlow} />
    </group>
  );
};

const OutputStack: React.FC<{ frame: number; heroProgress: number }> = ({
  frame,
  heroProgress,
}) => {
  const baseIn = interpolate(frame, [30, 60], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(...ease.brand),
  });
  const stand = interpolate(heroProgress, [0, 1], [0, 1], { easing: Easing.bezier(...ease.brand) });
  const rotZ = interpolate(stand, [0, 1], [-Math.PI / 2 + 0.05, -0.18]);
  const lift = interpolate(stand, [0, 1], [0.4, 1.55]);
  const glow = 0.2 + heroProgress * (0.4 + Math.sin(frame * 0.16) * 0.18);
  return (
    <group position={[6, 0, 0]} scale={baseIn}>
      <RoundedBox
        args={[2.2, 0.12, 2.7]}
        radius={0.05}
        smoothness={3}
        position={[0, 0.06, 0]}
        receiveShadow
        castShadow
      >
        <meshStandardMaterial color={c3.surface} roughness={0.78} metalness={0} />
      </RoundedBox>
      <group position={[-0.6, lift, 1.0]} rotation={[rotZ, 0.25, 0]}>
        <RoundedBox
          args={[1.7, 0.06, 2.3]}
          radius={0.03}
          smoothness={3}
          castShadow
          receiveShadow
          scale={stand}
        >
          <meshStandardMaterial color={c3.paper} roughness={0.55} metalness={0} />
        </RoundedBox>
        <RoundedBox
          args={[0.12, 0.08, 2.3]}
          radius={0.02}
          smoothness={2}
          position={[-0.79, 0.04, 0]}
          scale={stand}
          castShadow
        >
          <meshStandardMaterial
            color={c3.accent}
            emissive={c3.accentBright}
            emissiveIntensity={glow}
            roughness={0.4}
          />
        </RoundedBox>
      </group>
      <pointLight
        position={[0, 2.0, 1.4]}
        intensity={heroProgress * 1.3}
        distance={7}
        color={c3.accentGlow}
      />
    </group>
  );
};

export const IsoWorkflowScene: React.FC<{ frame: number }> = ({ frame }) => {
  const drift = interpolate(frame, [0, 270], [-0.06, 0.04], {
    easing: Easing.bezier(...ease.editorial),
  });
  const engineIn = interpolate(frame, [10, 44], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(...ease.pop),
  });
  const heroProgress = interpolate(frame, [206, 250], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(...ease.brand),
  });

  let launched = 0;
  for (let i = 0; i < SHEET_COUNT; i++) {
    if (frame >= FIRST_LAUNCH + i * LAUNCH_GAP) launched = i + 1;
  }

  return (
    <>
      <Lights />
      <ShadowGround opacity={0.18} />
      <group rotation={[0, drift, 0]}>
        <TrayPile frame={frame} launched={launched} />
        <Engine frame={frame} appear={engineIn} />
        <OutputStack frame={frame} heroProgress={heroProgress} />
        {Array.from({ length: SHEET_COUNT }).map((_, i) => {
          const launch = FIRST_LAUNCH + i * LAUNCH_GAP;
          const progress = interpolate(frame, [launch, launch + TRAVEL], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: Easing.bezier(...ease.inOut),
          });
          if (progress <= 0) return null;
          return <IsoWorkflowSheet key={i} progress={progress} index={i} stackSlot={i} />;
        })}
      </group>
    </>
  );
};
