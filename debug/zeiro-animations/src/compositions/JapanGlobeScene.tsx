import { Icosahedron, Sphere } from "@react-three/drei";
import { Easing, interpolate } from "remotion";
import type { ColorRepresentation } from "three";
import { ease } from "../theme";
import { c3 } from "../three/palette3d";
import {
  ARC_NODES,
  arcCurve,
  CORE_POS,
  GLOBE_R,
  NODES,
  partialCurve,
  sphericalToCartesian,
} from "./JapanGlobeHelpers";

export const Globe: React.FC<{ appear: number }> = ({ appear }) => (
  <group scale={appear}>
    <Sphere args={[GLOBE_R, 64, 64]}>
      <meshStandardMaterial
        color={c3.ink2}
        roughness={0.92}
        metalness={0.05}
        emissive={c3.accent}
        emissiveIntensity={0.12}
      />
    </Sphere>
    <Sphere args={[GLOBE_R * 1.012, 36, 24]}>
      <meshBasicMaterial color={c3.muted} wireframe transparent opacity={0.1 * appear} />
    </Sphere>
    <Sphere args={[GLOBE_R * 1.14, 48, 48]}>
      <meshBasicMaterial
        color={c3.accentGlow}
        transparent
        opacity={0.07 * appear}
        side={1}
        depthWrite={false}
      />
    </Sphere>
  </group>
);

export const Nodes: React.FC<{ frame: number }> = ({ frame }) => (
  <>
    {NODES.map((n, i) => {
      const p = sphericalToCartesian(GLOBE_R * 1.015, n.lat, n.long);
      const start = 40 + i * 9;
      const s = interpolate(frame, [start, start + 26], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.bezier(...ease.pop),
      });
      const pulse = 1 + 0.12 * Math.sin((frame + i * 17) * 0.08);
      return (
        <group key={i} position={[p.x, p.y, p.z]} scale={Math.max(0, s)}>
          <mesh scale={pulse}>
            <sphereGeometry args={[0.055, 18, 18]} />
            <meshStandardMaterial
              color={c3.accentGlow}
              emissive={c3.accentGlow}
              emissiveIntensity={2.4}
              roughness={0.3}
            />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.13, 18, 18]} />
            <meshBasicMaterial
              color={c3.accentGlow}
              transparent
              opacity={0.22 * s}
              depthWrite={false}
            />
          </mesh>
        </group>
      );
    })}
  </>
);

const Arc: React.FC<{ index: number; frame: number }> = ({ index, frame }) => {
  const node = NODES[ARC_NODES[index]];
  const from = sphericalToCartesian(GLOBE_R * 1.02, node.lat, node.long);
  const full = arcCurve(from);
  const start = 120 + index * 16;
  const f = interpolate(frame, [start, start + 60], [0.001, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(...ease.editorial),
  });
  const fade = interpolate(frame, [start, start + 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const drawn = partialCurve(full, f);
  const headPos = full.getPoint(f);
  const headOn = f > 0.02 && f < 0.999;
  return (
    <group>
      <mesh>
        <tubeGeometry args={[drawn, 40, 0.014, 8, false]} />
        <meshStandardMaterial
          color={c3.accentGlow}
          emissive={c3.accentGlow}
          emissiveIntensity={1.6}
          transparent
          opacity={0.85 * fade}
          roughness={0.4}
        />
      </mesh>
      {headOn && (
        <mesh position={[headPos.x, headPos.y, headPos.z]}>
          <sphereGeometry args={[0.045, 14, 14]} />
          <meshStandardMaterial
            color={c3.accentBright as ColorRepresentation}
            emissive={c3.accentGlow}
            emissiveIntensity={3}
          />
        </mesh>
      )}
    </group>
  );
};

export const Arcs: React.FC<{ frame: number }> = ({ frame }) => (
  <>
    {ARC_NODES.map((_, i) => (
      <Arc key={i} index={i} frame={frame} />
    ))}
  </>
);

export const Core: React.FC<{ frame: number; appear: number }> = ({ frame, appear }) => {
  const spin = frame * 0.012;
  const pulse = 1 + 0.06 * Math.sin(frame * 0.07);
  return (
    <group position={[CORE_POS.x, CORE_POS.y, CORE_POS.z]} scale={appear * pulse}>
      <Icosahedron args={[0.34, 0]} rotation={[spin * 0.6, spin, 0]}>
        <meshStandardMaterial
          color={c3.accent}
          emissive={c3.accentBright}
          emissiveIntensity={0.9}
          roughness={0.25}
          metalness={0.3}
          flatShading
        />
      </Icosahedron>
      <mesh>
        <sphereGeometry args={[0.62, 24, 24]} />
        <meshBasicMaterial color={c3.accentGlow} transparent opacity={0.16} depthWrite={false} />
      </mesh>
    </group>
  );
};

export const Stars: React.FC = () => (
  <>
    {Array.from({ length: 70 }).map((_, i) => {
      const a = i * 2.39996;
      const r = 9 + (i % 7) * 0.9;
      const y = Math.sin(i * 1.7) * 6;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r - 4;
      const o = 0.1 + 0.12 * ((Math.sin(i * 3.1) + 1) / 2);
      return (
        <mesh key={i} position={[x, y, z]}>
          <sphereGeometry args={[0.018, 6, 6]} />
          <meshBasicMaterial color={c3.muted2} transparent opacity={o} depthWrite={false} />
        </mesh>
      );
    })}
  </>
);
