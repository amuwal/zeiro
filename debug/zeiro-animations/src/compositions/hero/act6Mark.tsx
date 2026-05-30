import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { fonts } from "../../fonts";
import { ease, palette } from "../../theme";

export const Act6Mark: React.FC = () => {
  const frame = useCurrentFrame();

  const inT = interpolate(frame, [0, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(...ease.brand),
  });
  const lineT = interpolate(frame, [16, 50], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(...ease.editorial),
  });
  const tagT = interpolate(frame, [40, 75], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(...ease.brand),
  });

  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 28,
      }}
    >
      <div
        style={{
          fontFamily: fonts.sans,
          fontSize: 240,
          fontWeight: 700,
          letterSpacing: "-0.045em",
          color: palette.ink,
          lineHeight: 1,
          opacity: inT,
          transform: `translateY(${(1 - inT) * 16}px)`,
        }}
      >
        ZEIRO
      </div>
      <div
        style={{
          width: 720,
          height: 4,
          backgroundColor: palette.line,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: 4,
            backgroundColor: palette.accent,
            transformOrigin: "left center",
            transform: `scaleX(${lineT})`,
          }}
        />
      </div>
      <div
        style={{
          fontFamily: fonts.jp,
          fontSize: 28,
          color: palette.muted,
          letterSpacing: "0.22em",
          opacity: tagT,
          transform: `translateY(${(1 - tagT) * 10}px)`,
        }}
      >
        税理士事務所のための AI エージェント
      </div>
      <div
        style={{
          fontFamily: fonts.mono,
          fontSize: 14,
          color: palette.muted2,
          letterSpacing: "0.32em",
          textTransform: "uppercase",
          opacity: tagT * 0.7,
          marginTop: 8,
        }}
      >
        zeiro.io
      </div>
    </AbsoluteFill>
  );
};
