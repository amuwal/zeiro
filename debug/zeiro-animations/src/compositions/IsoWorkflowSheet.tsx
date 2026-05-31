import { RoundedBox } from '@react-three/drei';
import { c3, categoryColors } from '../three/palette3d';

// A document sheet that travels the conveyor: in-tray -> engine arc -> output stack.
// `progress` is 0..1 along the journey; the path is keyframed so the sheet lifts in a
// parabolic arc through the center engine, spins, then settles flat on the right stack.
type Vec3 = [number, number, number];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Piecewise-linear interpolation over keyframe stops (each a [t, value]).
const along = (stops: ReadonlyArray<readonly [number, number]>, t: number) => {
  if (t <= stops[0][0]) return stops[0][1];
  const last = stops[stops.length - 1];
  if (t >= last[0]) return last[1];
  for (let i = 0; i < stops.length - 1; i++) {
    const [t0, v0] = stops[i];
    const [t1, v1] = stops[i + 1];
    if (t >= t0 && t <= t1) {
      const k = (t - t0) / (t1 - t0);
      // smoothstep within each segment for organic, non-linear travel
      const s = k * k * (3 - 2 * k);
      return lerp(v0, v1, s);
    }
  }
  return last[1];
};

export const IsoWorkflowSheet: React.FC<{
  progress: number;
  index: number;
  stackSlot: number;
}> = ({ progress, index, stackSlot }) => {
  // Deterministic per-sheet jitter from the index via trig.
  const jx = Math.sin(index * 2.3) * 0.16;
  const jz = Math.cos(index * 1.7) * 0.16;

  const startX = -6 + jx;
  const startZ = jz;
  // Fanned output: each settled sheet nudged + tiny lateral fan, stacked in height.
  const restX = 6 + (stackSlot % 2 === 0 ? -0.18 : 0.18);
  const restY = 0.32 + stackSlot * 0.13;
  const restZ = (stackSlot - 2.5) * 0.14;

  const x = along(
    [
      [0, startX],
      [0.42, 0],
      [1, restX],
    ],
    progress,
  );
  // Parabolic lift that peaks over the engine (~progress 0.42).
  const arc = Math.sin(Math.min(progress / 0.84, 1) * Math.PI) * 3.0;
  const y = lerp(0.5, restY, progress) + arc;
  const z = along(
    [
      [0, startZ],
      [0.42, 0],
      [1, restZ],
    ],
    progress,
  );

  // Spin while airborne, settle to a flat fan tilt on landing.
  const airborne = progress > 0.06 && progress < 0.9;
  const spin = airborne ? progress * 7.5 : 0;
  const restTilt = (stackSlot % 2 === 0 ? -1 : 1) * 0.05;
  const rotY = lerp(0, restTilt, Math.max(0, (progress - 0.9) / 0.1));

  const pos: Vec3 = [x, y, z];
  const tabColor = categoryColors[index % categoryColors.length];
  // Tab fades in as the sheet passes the engine (gains its classification).
  const tabScale = Math.max(0, Math.min(1, (progress - 0.45) / 0.2));

  return (
    <group position={pos} rotation={[spin * 0.4, rotY + spin, spin * 0.2]}>
      <RoundedBox args={[1.6, 0.05, 2.1]} radius={0.03} smoothness={3} castShadow receiveShadow>
        <meshStandardMaterial color={c3.paper} roughness={0.62} metalness={0} />
      </RoundedBox>
      <RoundedBox
        args={[0.34, 0.06, 0.34]}
        radius={0.02}
        smoothness={2}
        position={[0.5, 0.02, -0.78]}
        scale={tabScale}
        castShadow
      >
        <meshStandardMaterial color={tabColor} roughness={0.5} metalness={0.05} />
      </RoundedBox>
    </group>
  );
};
