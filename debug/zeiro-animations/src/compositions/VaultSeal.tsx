import { ThreeCanvas } from "@remotion/three";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Background } from "../common/Background";
import { fonts } from "../fonts";
import { ease, palette, radius } from "../theme";
import { c3 } from "../three/palette3d";
import { Lights, ShadowGround } from "../three/rig";
import { VaultSealScene } from "./VaultSealScene";

const bez = (e: readonly [number, number, number, number]) => Easing.bezier(e[0], e[1], e[2], e[3]);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const CHECKLIST = ["個人番号 ********", "氏名・住所 マスキング", "監査ログ 記録", "学習利用なし (no-training)"];

export const VaultSeal: React.FC = () => {
  const { width, height } = useVideoConfig();
  const frame = useCurrentFrame();

  const camZ = interpolate(frame, [0, 70], [10, 9], { ...clamp, easing: bez(ease.editorial) });
  const eyebrowIn = interpolate(frame, [4, 28], [0, 1], { ...clamp, easing: bez(ease.brand) });
  const headlineIn = interpolate(frame, [14, 44], [0, 1], { ...clamp, easing: bez(ease.brand) });
  const footerIn = interpolate(frame, [200, 226], [0, 1], { ...clamp, easing: bez(ease.brand) });

  return (
    <AbsoluteFill>
      <Background variant="ink" />
      <ThreeCanvas
        width={width}
        height={height}
        shadows
        camera={{ position: [0, 1.5, camZ], fov: 33 }}
        gl={{ alpha: true, antialias: true }}
        style={{ position: "absolute", inset: 0 }}
      >
        <Lights intensity={0.92} keyPosition={[6, 9, 10]} />
        <ShadowGround y={-3.6} opacity={0.22} />
        <VaultSealScene frame={frame} />
      </ThreeCanvas>

      <AbsoluteFill style={{ pointerEvents: "none" }}>
        {/* Eyebrow + headline, upper-left */}
        <div style={{ position: "absolute", top: 110, left: 120, maxWidth: 760 }}>
          <div
            style={{
              opacity: eyebrowIn,
              transform: `translateY(${(1 - eyebrowIn) * 10}px)`,
              fontFamily: fonts.mono,
              fontSize: 14,
              color: palette.muted2,
              letterSpacing: "0.4em",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
          >
            守秘義務 · 税理士法 §38
          </div>
          <div
            style={{
              opacity: headlineIn,
              transform: `translateY(${(1 - headlineIn) * 16}px)`,
              fontFamily: fonts.jp,
              fontSize: 50,
              fontWeight: 700,
              color: palette.bg,
              letterSpacing: "-0.02em",
              marginTop: 22,
              lineHeight: 1.25,
            }}
          >
            預かった情報は、預かったまま。
          </div>
        </div>

        {/* Checklist, right side — items flip to locked ✓ */}
        <div
          style={{
            position: "absolute",
            top: 332,
            right: 120,
            width: 388,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {CHECKLIST.map((label, i) => {
            const start = 34 + i * 22;
            const appear = interpolate(frame, [start - 6, start + 12], [0, 1], { ...clamp, easing: bez(ease.brand) });
            const lock = interpolate(frame, [start + 60, start + 78], [0, 1], { ...clamp, easing: bez(ease.pop) });
            return <ChecklistRow key={label} label={label} appear={appear} lock={lock} />;
          })}
        </div>

        {/* Footer, bottom-left */}
        <div
          style={{
            position: "absolute",
            bottom: 96,
            left: 120,
            opacity: footerIn,
            transform: `translateY(${(1 - footerIn) * 10}px)`,
            fontFamily: fonts.mono,
            fontSize: 14,
            color: palette.muted,
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
          }}
        >
          PII masking · audit log · data residency jp-tokyo
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const ChecklistRow: React.FC<{ label: string; appear: number; lock: number }> = ({
  label,
  appear,
  lock,
}) => (
  <div
    style={{
      opacity: appear,
      transform: `translateX(${(1 - appear) * 28}px)`,
      display: "flex",
      alignItems: "center",
      gap: 14,
      backgroundColor: lock > 0.5 ? palette.surface : palette.ink2,
      border: `1px solid ${lock > 0.5 ? palette.accent : palette.lineStrong}`,
      borderLeft: `3px solid ${palette.accent}`,
      borderRadius: radius.md,
      padding: "13px 16px",
      boxShadow: `0 ${12 * lock}px ${36 * lock}px -18px rgba(0,0,0,0.5)`,
    }}
  >
    <div
      style={{
        width: 26,
        height: 26,
        flexShrink: 0,
        borderRadius: 7,
        backgroundColor: lock > 0.5 ? c3.accent : "transparent",
        border: `1.5px solid ${lock > 0.5 ? c3.accent : palette.muted}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transform: `scale(${0.6 + 0.4 * lock})`,
      }}
    >
      <span
        style={{
          fontFamily: fonts.sans,
          fontSize: 16,
          fontWeight: 700,
          color: palette.bg,
          opacity: lock,
          lineHeight: 1,
        }}
      >
        ✓
      </span>
    </div>
    <span
      style={{
        fontFamily: fonts.jp,
        fontSize: 19,
        fontWeight: 600,
        color: lock > 0.5 ? palette.ink : palette.bg,
        letterSpacing: "-0.005em",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  </div>
);
