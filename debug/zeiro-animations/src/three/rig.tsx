import { c3 } from './palette3d';

// Soft three-point studio rig tuned for matte "paper" materials on a cream stage.
// Warm key light from upper-right, cool accent fill from the left, gentle ambient
// so shadows stay open (editorial, not dramatic). Shadow map kept at 2048 — enough
// for crisp contact shadows in headless WebGL renders without tanking frame time.
export const Lights: React.FC<{
  shadows?: boolean;
  intensity?: number;
  keyPosition?: [number, number, number];
}> = ({ shadows = true, intensity = 1, keyPosition = [7, 12, 8] }) => (
  <>
    <ambientLight intensity={0.5 * intensity} />
    <hemisphereLight args={[c3.surface, c3.bg2, 0.45 * intensity]} />
    <directionalLight
      position={keyPosition}
      intensity={1.35 * intensity}
      color="#fff6e6"
      castShadow={shadows}
      shadow-mapSize-width={2048}
      shadow-mapSize-height={2048}
      shadow-camera-near={1}
      shadow-camera-far={60}
      shadow-camera-left={-18}
      shadow-camera-right={18}
      shadow-camera-top={18}
      shadow-camera-bottom={-18}
      shadow-bias={-0.0004}
      shadow-normalBias={0.02}
    />
    <directionalLight position={[-9, 5, -7]} intensity={0.45 * intensity} color={c3.accentSoft} />
    <pointLight position={[0, 4, 7]} intensity={0.35 * intensity} color="#ffffff" />
  </>
);

// Invisible plane that only catches shadows — lets the cream <Background/> show through
// while objects still cast soft contact shadows. Place at the object base height.
export const ShadowGround: React.FC<{
  y?: number;
  opacity?: number;
  size?: number;
}> = ({ y = 0, opacity = 0.16, size = 80 }) => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} receiveShadow>
    <planeGeometry args={[size, size]} />
    <shadowMaterial transparent opacity={opacity} color={c3.ink} />
  </mesh>
);
