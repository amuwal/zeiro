import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { fonts } from "../../fonts";
import { ease, palette } from "../../theme";

// 0-60 frames (local). An accent line sweeps horizontally across the canvas,
// "cutting through" the chaos, then the ZEIRO wordmark fades up centered.

export const Act2Cut: React.FC = () => {
  const frame = useCurrentFrame();

  const sweep = interpolate(frame, [0, 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(...ease.editorial),
  });

  const wordmarkIn = interpolate(frame, [16, 44], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(...ease.brand),
  });

  const subIn = interpolate(frame, [30, 56], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(...ease.brand),
  });

  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: 0,
          right: 0,
          height: 4,
          transform: "translateY(-2px)",
          backgroundColor: palette.accent,
          transformOrigin: "left center",
          scale: `${sweep} 1`,
          boxShadow: `0 0 40px 6px ${palette.accentSoft}`,
        }}
      />

      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div
          style={{
            fontFamily: fonts.sans,
            fontSize: 220,
            fontWeight: 700,
            letterSpacing: "-0.045em",
            color: palette.ink,
            opacity: wordmarkIn,
            transform: `translateY(${(1 - wordmarkIn) * 14}px)`,
            lineHeight: 1,
          }}
        >
          ZEIRO
        </div>
        <div
          style={{
            fontFamily: fonts.jp,
            fontSize: 24,
            color: palette.muted,
            letterSpacing: "0.22em",
            opacity: subIn,
            transform: `translateY(${(1 - subIn) * 8}px)`,
          }}
        >
          ぜんぶ、引き受ける。
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
