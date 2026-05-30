import { ThreeCanvas } from "@remotion/three";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Background } from "../common/Background";
import { fonts } from "../fonts";
import { ease, palette } from "../theme";
import { DocumentVortexScene } from "./DocumentVortexScene";

const SAFE = 120;

export const DocumentVortex: React.FC = () => {
  const { width, height } = useVideoConfig();
  const frame = useCurrentFrame();

  // Slow editorial dolly-in: z 18 -> 13 over the whole shot.
  const dollyZ = interpolate(frame, [0, 240], [18, 13], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(...ease.editorial),
  });

  // Global collapse progress tracks the last sheet's settle window so the counter
  // reaches 0 right as the stack lands (~frame 200).
  const globalProgress = interpolate(frame, [10, 200], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(...ease.brand),
  });
  const unread = Math.round(142 * (1 - globalProgress));

  const headIn = interpolate(frame, [0, 26], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(...ease.brand),
  });
  const footIn = interpolate(frame, [150, 180], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(...ease.brand),
  });
  const counterIn = interpolate(frame, [6, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(...ease.crisp),
  });

  return (
    <AbsoluteFill>
      <Background variant="cream" />

      <ThreeCanvas
        width={width}
        height={height}
        shadows
        camera={{ position: [0, 6, dollyZ], fov: 32 }}
        gl={{ alpha: true, antialias: true }}
        style={{ position: "absolute", inset: 0 }}
      >
        <DocumentVortexScene />
      </ThreeCanvas>

      <AbsoluteFill style={{ pointerEvents: "none" }}>
        {/* Top-left: eyebrow + headline */}
        <div style={{ position: "absolute", left: SAFE, top: SAFE, opacity: headIn }}>
          <div
            style={{
              fontFamily: fonts.mono,
              fontSize: 14,
              color: palette.muted2,
              letterSpacing: "0.4em",
              textTransform: "uppercase",
              transform: `translateY(${(1 - headIn) * 10}px)`,
              whiteSpace: "nowrap",
            }}
          >
            INBOX · 整理
          </div>
          <div
            style={{
              fontFamily: fonts.jp,
              fontSize: 54,
              fontWeight: 700,
              color: palette.ink,
              letterSpacing: "-0.02em",
              marginTop: 18,
              lineHeight: 1.18,
              transform: `translateY(${(1 - headIn) * 16}px)`,
              maxWidth: 760,
            }}
          >
            未読の渦を、ひとつの流れに。
          </div>
        </div>

        {/* Top-right: live unread counter ticking 142 -> 0 */}
        <div
          style={{
            position: "absolute",
            right: SAFE,
            top: SAFE,
            textAlign: "right",
            opacity: counterIn,
            transform: `translateY(${(1 - counterIn) * 10}px)`,
          }}
        >
          <div
            style={{
              fontFamily: fonts.sans,
              fontSize: 120,
              fontWeight: 700,
              color: unread === 0 ? palette.positive : palette.ink,
              lineHeight: 0.9,
              letterSpacing: "-0.04em",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {unread}
          </div>
          <div
            style={{
              fontFamily: fonts.jp,
              fontSize: 22,
              fontWeight: 500,
              color: palette.muted,
              marginTop: 6,
              whiteSpace: "nowrap",
            }}
          >
            件 未読
          </div>
        </div>

        {/* Bottom caption */}
        <div
          style={{
            position: "absolute",
            left: SAFE,
            bottom: SAFE,
            opacity: footIn,
            transform: `translateY(${(1 - footIn) * 10}px)`,
            fontFamily: fonts.mono,
            fontSize: 15,
            color: palette.muted,
            letterSpacing: "0.22em",
            whiteSpace: "nowrap",
          }}
        >
          142 件 → 整理完了 · 平均 0.4 秒 / 件
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
