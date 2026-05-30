import { RoundedBox } from '@react-three/drei';
import { Easing, interpolate } from 'remotion';
import { ease } from '../theme';
import { c3 } from '../three/palette3d';

// 26 weekly "hours saved" values: a quick ramp from ~6h, climbing into the
// 14-16h plateau, with a gentle deterministic jitter so the skyline reads as
// real data rather than a smooth curve. No RNG — jitter is trig of the index.
export const WEEKS = 26;
const MAX_H = 16;

export const weekHours = (i: number): number => {
  const ramp = 6 + 10 * (1 - Math.exp(-i / 7));
  const jitter = Math.sin(i * 1.7) * 0.9 + Math.cos(i * 0.6) * 0.6;
  return Math.min(MAX_H, Math.max(4, ramp + jitter));
};

const PEAK = (() => {
  let best = 0;
  let idx = 0;
  for (let i = 0; i < WEEKS; i++) {
    if (weekHours(i) > best) {
      best = weekHours(i);
      idx = i;
    }
  }
  return idx;
})();

const GAP = 0.12;
const TW = 0.46;
const STEP = TW + GAP;
const SPAN = STEP * (WEEKS - 1);
const UNIT = 0.34; // world-units of tower height per hour saved

const TOWERS = Array.from({ length: WEEKS }, (_, i) => ({
  id: `W${String(i + 1).padStart(2, '0')}`,
  i,
  hours: weekHours(i),
}));

export const KpiMonolithScene: React.FC<{ frame: number }> = ({ frame }) => {
  // Highlight sweep travels across the row 170→220, brightening the tower it passes.
  const sweepX = interpolate(frame, [168, 222], [-1, WEEKS], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(...ease.editorial),
  });

  return (
    <group position={[-SPAN / 2, 0, 0]}>
      <DataFloor />
      {TOWERS.map(({ id, i, hours }) => {
        const norm = (hours - 4) / (MAX_H - 4);
        const full = hours * UNIT;

        const grow = interpolate(frame, [20 + i * 3, 52 + i * 3], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: Easing.bezier(...ease.brand),
        });
        const h = Math.max(0.001, full * grow);

        const sweep = Math.max(0, 1 - Math.abs(sweepX - i)) ** 2;
        const isPeak = i === PEAK;
        const baseEmissive = 0.25 + norm * 1.15;
        const emissiveIntensity = baseEmissive + sweep * 1.4 + (isPeak ? 0.5 : 0);

        const color = norm > 0.82 ? c3.accentBright : c3.accent;
        const emissive = norm > 0.82 || sweep > 0.4 ? c3.accentGlow : c3.accentBright;

        return (
          <group key={id} position={[i * STEP, 0, 0]}>
            <RoundedBox
              args={[TW, h, 0.5]}
              radius={0.05}
              smoothness={3}
              position={[0, h / 2, 0]}
              castShadow
              receiveShadow
            >
              <meshStandardMaterial
                color={color}
                emissive={emissive}
                emissiveIntensity={emissiveIntensity * grow}
                roughness={0.32}
                metalness={0.18}
              />
            </RoundedBox>
            {/* Glowing cap to accent the very top of each tower */}
            <mesh position={[0, h + 0.015, 0]}>
              <boxGeometry args={[TW * 0.92, 0.03, 0.46]} />
              <meshStandardMaterial
                color={c3.accentGlow}
                emissive={c3.accentGlow}
                emissiveIntensity={(1.6 + sweep * 2.2) * grow}
                roughness={0.2}
                toneMapped={false}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};

// Dark data-floor: a matte plane plus faint inset gridlines running with the row,
// so the towers read as bars on a chart rather than free-floating blocks.
const DataFloor: React.FC = () => {
  const lines = [-3.4, -1.7, 0, 1.7, 3.4];
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[SPAN / 2, -0.001, 0]} receiveShadow>
        <planeGeometry args={[SPAN + 6, 12]} />
        <meshStandardMaterial color={c3.ink2} roughness={0.95} metalness={0} />
      </mesh>
      {lines.map((z) => (
        <mesh key={`grid-${z}`} position={[SPAN / 2, 0.002, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[SPAN + 5, 0.02]} />
          <meshStandardMaterial
            color={c3.inkSoft}
            emissive={c3.accent}
            emissiveIntensity={0.12}
            roughness={1}
            transparent
            opacity={0.5}
          />
        </mesh>
      ))}
    </group>
  );
};
