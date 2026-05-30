import { RoundedBox } from "@react-three/drei";
import { Easing, interpolate } from "remotion";
import { ease } from "../theme";
import { c3 } from "../three/palette3d";

const bez = (e: readonly [number, number, number, number]) => Easing.bezier(e[0], e[1], e[2], e[3]);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// PII sheets fly from screen edges toward the vault face (z>0) and get absorbed:
// translate to center, scale down, fade. Staggered start every 22 frames from f=34.
const SHEETS: { from: [number, number]; rot: number }[] = [
  { from: [-7.4, 3.2], rot: -0.5 },
  { from: [7.4, 3.0], rot: 0.5 },
  { from: [-7.0, -3.4], rot: 0.4 },
  { from: [7.0, -3.2], rot: -0.45 },
];

const Sheet: React.FC<{ frame: number; i: number }> = ({ frame, i }) => {
  const start = 34 + i * 22;
  const t = interpolate(frame, [start, start + 46], [0, 1], { ...clamp, easing: bez(ease.brand) });
  const cfg = SHEETS[i];
  const x = interpolate(t, [0, 1], [cfg.from[0], 0]);
  const y = interpolate(t, [0, 1], [cfg.from[1], 0]);
  const z = interpolate(t, [0, 1], [2.6, 0.55]);
  const appear = interpolate(frame, [start, start + 8], [0, 1], { ...clamp, easing: bez(ease.brand) });
  const absorbed = interpolate(t, [0.7, 1], [1, 0], clamp);
  const opacity = Math.min(appear, absorbed);
  if (opacity <= 0.001) return null;
  const scale = interpolate(t, [0, 0.7, 1], [1, 0.92, 0.12]);
  const tumble = cfg.rot * (1 - t);
  return (
    <RoundedBox
      args={[1.7, 2.2, 0.05]}
      radius={0.04}
      smoothness={3}
      position={[x, y, z]}
      rotation={[0.04, tumble, tumble * 0.3]}
      scale={[scale, scale, scale]}
      castShadow
    >
      <meshStandardMaterial
        color={c3.paper}
        roughness={0.55}
        metalness={0}
        transparent
        opacity={opacity}
        emissive={c3.accentBright}
        emissiveIntensity={(1 - absorbed) * 0.7}
      />
    </RoundedBox>
  );
};

const Ring: React.FC<{
  r: number;
  tube: number;
  z: number;
  rotation: number;
  color: string;
  emissive: string;
  emissiveIntensity: number;
  metalness: number;
  roughness: number;
  scale: number;
}> = ({ r, tube, z, rotation, color, emissive, emissiveIntensity, metalness, roughness, scale }) => (
  <mesh position={[0, 0, z]} rotation={[0, 0, rotation]} scale={scale} castShadow receiveShadow>
    <torusGeometry args={[r, tube, 24, 96]} />
    <meshStandardMaterial
      color={color}
      emissive={emissive}
      emissiveIntensity={emissiveIntensity}
      metalness={metalness}
      roughness={roughness}
    />
  </mesh>
);

export const VaultSealScene: React.FC<{ frame: number }> = ({ frame }) => {
  const assemble = interpolate(frame, [0, 40], [0, 1], { ...clamp, easing: bez(ease.brand) });
  const doorScale = interpolate(frame, [0, 40], [0.7, 1], { ...clamp, easing: bez(ease.pop) });

  // Dial rings idle-rotate during ingest, then spin shut and lock from f=150.
  const idle = interpolate(frame, [40, 150], [0, 0.9], { ...clamp, easing: bez(ease.editorial) });
  const lock = interpolate(frame, [150, 200], [0, 1], { ...clamp, easing: bez(ease.editorial) });
  const dialA = idle - lock * (0.9 + Math.PI / 6);
  const dialB = -idle * 1.3 + lock * (1.3 * 0.9 + Math.PI / 5);

  // Seal pulse: a thin bright torus expands outward once around f=160–195.
  const pulseT = interpolate(frame, [158, 196], [0, 1], { ...clamp, easing: bez(ease.editorial) });
  const pulseScale = interpolate(pulseT, [0, 1], [1.0, 1.55]);
  const pulseOpacity = interpolate(pulseT, [0, 0.25, 1], [0, 0.9, 0], clamp);

  const shieldGlow = interpolate(frame, [150, 196], [0.5, 1.7], { ...clamp, easing: bez(ease.brand) });
  const shieldScale = interpolate(frame, [10, 40], [0, 1], { ...clamp, easing: bez(ease.pop) });

  return (
    <group rotation={[0, 0, 0]}>
      {/* Door disc — thick cylinder rotated to face camera (+z) */}
      <mesh
        rotation={[Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        scale={[doorScale, 1, doorScale]}
        castShadow
        receiveShadow
      >
        <cylinderGeometry args={[3.0, 3.0, 0.7, 96]} />
        <meshStandardMaterial color={c3.ink2} metalness={0.32} roughness={0.5} />
      </mesh>

      {/* Recessed door face disc so the center reads solid before the shield arrives */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.34]} scale={[doorScale, 1, doorScale]} receiveShadow>
        <cylinderGeometry args={[2.55, 2.55, 0.04, 96]} />
        <meshStandardMaterial color={c3.ink} metalness={0.3} roughness={0.6} emissive={c3.accent} emissiveIntensity={0.12 * assemble} />
      </mesh>

      {/* Accent emissive trim ring flush on the door face */}
      <Ring r={2.78} tube={0.05} z={0.36} rotation={0} color={c3.accent} emissive={c3.accentBright} emissiveIntensity={0.7 * assemble} metalness={0.4} roughness={0.4} scale={doorScale} />

      {/* Outer static ring */}
      <Ring r={3.35} tube={0.16} z={0.05} rotation={0} color={c3.ink2} emissive={c3.accent} emissiveIntensity={0.18 * assemble} metalness={0.35} roughness={0.55} scale={assemble} />

      {/* Inner dial rings — rotate during ingest, lock on seal */}
      <Ring r={2.4} tube={0.12} z={0.28} rotation={dialA} color={c3.inkSoft} emissive={c3.accentBright} emissiveIntensity={0.22 * assemble} metalness={0.4} roughness={0.45} scale={doorScale} />
      <Ring r={1.78} tube={0.1} z={0.32} rotation={dialB} color={c3.muted} emissive={c3.accentBright} emissiveIntensity={0.2 * assemble} metalness={0.45} roughness={0.42} scale={doorScale} />

      {/* Seal pulse torus */}
      <mesh position={[0, 0, 0.4]} scale={[pulseScale, pulseScale, 1]}>
        <torusGeometry args={[3.0, 0.035, 16, 96]} />
        <meshStandardMaterial
          color={c3.accentGlow}
          emissive={c3.accentGlow}
          emissiveIntensity={2.4}
          transparent
          opacity={pulseOpacity}
        />
      </mesh>

      {/* Center shield / lock emblem — rounded plate facing camera */}
      <group position={[0, 0, 0.42]} scale={shieldScale}>
        <RoundedBox args={[1.5, 1.7, 0.28]} radius={0.4} smoothness={5} castShadow receiveShadow>
          <meshStandardMaterial
            color={c3.accent}
            emissive={c3.accentBright}
            emissiveIntensity={shieldGlow}
            metalness={0.25}
            roughness={0.4}
          />
        </RoundedBox>
        {/* Keyhole bar */}
        <RoundedBox args={[0.16, 0.6, 0.1]} radius={0.06} smoothness={4} position={[0, -0.12, 0.18]}>
          <meshStandardMaterial color={c3.accentInk} roughness={0.5} metalness={0.2} />
        </RoundedBox>
        <mesh position={[0, 0.18, 0.18]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.18, 0.18, 0.1, 24]} />
          <meshStandardMaterial color={c3.accentInk} roughness={0.5} metalness={0.2} />
        </mesh>
      </group>

      {SHEETS.map((_, i) => (
        <Sheet key={i} frame={frame} i={i} />
      ))}
    </group>
  );
};
