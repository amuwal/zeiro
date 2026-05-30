import { useThree } from '@react-three/fiber';
import { ThreeCanvas } from '@remotion/three';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { Background } from '../common/Background';
import { ease } from '../theme';
import { c3 } from '../three/palette3d';
import { Lights } from '../three/rig';
import { KpiMonolithOverlay } from './KpiMonolithOverlay';
import { KpiMonolithScene } from './KpiMonolithScene';

export const KpiMonolith: React.FC = () => {
  const { width, height } = useVideoConfig();
  const frame = useCurrentFrame();

  const angle = interpolate(frame, [0, 240], [-0.32, 0.16], {
    easing: Easing.bezier(...ease.editorial),
  });
  const camPos: [number, number, number] = [Math.sin(angle) * 23, 6.2, Math.cos(angle) * 23];

  return (
    <AbsoluteFill>
      <Background variant="ink" />

      <ThreeCanvas
        width={width}
        height={height}
        shadows
        camera={{ position: camPos, fov: 37 }}
        gl={{ alpha: true, antialias: true }}
        style={{ position: 'absolute', inset: 0 }}
      >
        <OrbitCamera position={camPos} />
        <Lights intensity={0.85} keyPosition={[8, 14, 6]} />
        <directionalLight position={[-6, 9, -8]} intensity={0.4} color={c3.accentGlow} />
        <KpiMonolithScene frame={frame} />
      </ThreeCanvas>

      <KpiMonolithOverlay frame={frame} />
    </AbsoluteFill>
  );
};

// Re-aims the fixed Remotion camera at the tower row every render. useThree is a
// store read (not useFrame), so this stays deterministic and frame-driven: the
// orbit position comes in as a prop, we set it and look at the row's mid-height.
const OrbitCamera: React.FC<{ position: [number, number, number] }> = ({ position }) => {
  const camera = useThree((s) => s.camera);
  camera.position.set(position[0], position[1], position[2]);
  camera.lookAt(0, 1.9, 0);
  camera.updateProjectionMatrix();
  return null;
};
