import { RoundedBox } from "@react-three/drei";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { ease } from "../theme";
import { c3, categoryColors } from "../three/palette3d";
import { Lights, ShadowGround } from "../three/rig";

const SHEET_COUNT = 100;
const GOLDEN = 2.39996;

type Vec3 = [number, number, number];

// Deterministic chaos pose for sheet i: a wide swirling shell sampled by the
// golden angle so the cloud reads evenly distributed, with a per-sheet euler spin.
const chaosPose = (i: number): { pos: Vec3; rot: Vec3 } => {
  const angle = i * GOLDEN;
  const radius = 6 + (i % 5);
  const y = Math.sin(i) * 4;
  return {
    pos: [Math.cos(angle) * radius, y, Math.sin(angle) * radius],
    rot: [Math.sin(i * 1.7) * 1.6, angle, Math.cos(i * 0.9) * 1.4],
  };
};

// Target pose in the final neat stack: centred, stepped in y, near-flat with a
// barely-there fan rotation so the stack still feels hand-set rather than rigid.
const targetPose = (i: number): { pos: Vec3; rot: Vec3 } => ({
  pos: [0, i * 0.024, 0],
  rot: [0, Math.sin(i * 0.4) * 0.04, 0],
});

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const DocumentVortexScene: React.FC = () => {
  const frame = useCurrentFrame();

  // Once-around accent torus pulse near the stack base, 210..240.
  const pulse = interpolate(frame, [210, 224, 240], [0, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(...ease.editorial),
  });

  return (
    <>
      <Lights />
      <ShadowGround y={-0.02} opacity={0.18} />

      {Array.from({ length: SHEET_COUNT }, (_, i) => {
        const start = (i / SHEET_COUNT) * 120;
        const p = interpolate(frame, [start, start + 60], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(...ease.brand),
        });
        const opacity = interpolate(frame, [start, start + 15], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        const chaos = chaosPose(i);
        const target = targetPose(i);

        // Tighten the vortex: spin the still-chaotic contribution around Y so the
        // cloud keeps living while it collapses inward toward the stack.
        const swirl = (1 - p) * (i * GOLDEN) + frame * 0.01;
        const cx = chaos.pos[0];
        const cz = chaos.pos[2];
        const sx = cx * Math.cos(swirl) - cz * Math.sin(swirl);
        const sz = cx * Math.sin(swirl) + cz * Math.cos(swirl);

        const pos: Vec3 = [
          lerp(sx, target.pos[0], p),
          lerp(chaos.pos[1], target.pos[1], p),
          lerp(sz, target.pos[2], p),
        ];
        const rot: Vec3 = [
          lerp(chaos.rot[0] + swirl * 0.3, target.rot[0], p),
          lerp(chaos.rot[1] + swirl, target.rot[1], p),
          lerp(chaos.rot[2], target.rot[2], p),
        ];

        const edgeColor = categoryColors[i % 4];

        return (
          <group key={i} position={pos} rotation={rot} scale={opacity * 0.85 + 0.15}>
            <RoundedBox args={[3, 0.018, 2.1]} radius={0.015} smoothness={2} castShadow receiveShadow>
              <meshStandardMaterial
                color={c3.paper}
                roughness={0.82}
                metalness={0}
                transparent
                opacity={opacity}
              />
            </RoundedBox>
            {/* category-coded edge strip along one long side */}
            <mesh position={[0, 0, 1.0]}>
              <boxGeometry args={[3, 0.026, 0.12]} />
              <meshStandardMaterial
                color={edgeColor}
                roughness={0.55}
                metalness={0.05}
                emissive={edgeColor}
                emissiveIntensity={0.12}
                transparent
                opacity={opacity}
              />
            </mesh>
          </group>
        );
      })}

      {/* Accent torus pulses once around the settled stack base. */}
      {pulse > 0.001 && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={1 + pulse * 0.4}>
          <torusGeometry args={[3.0, 0.045, 16, 96]} />
          <meshStandardMaterial
            color={c3.accentBright}
            emissive={c3.accentGlow}
            emissiveIntensity={1.4 * pulse}
            roughness={0.4}
            metalness={0.2}
            transparent
            opacity={0.85 * pulse}
          />
        </mesh>
      )}
    </>
  );
};
