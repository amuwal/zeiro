import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { Background } from "../common/Background";
import { fonts } from "../fonts";
import { ease, palette, radius } from "../theme";

const CHECKS = [
  "守秘義務 (税理士法 §38)",
  "個人情報保護法 適合",
  "監査ログ (誰が・いつ・何を)",
  "PII マスキング 自動",
  "no-train LLM 契約",
  "データ保管 jp-tokyo",
];

export const TrustShield: React.FC = () => {
  const frame = useCurrentFrame();

  const headerIn = interpolate(frame, [0, 24], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(...ease.brand),
  });

  const shieldDraw = interpolate(frame, [20, 80], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(...ease.brand),
  });

  const checkAppear = interpolate(frame, [80, 110], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(...ease.pop),
  });

  return (
    <AbsoluteFill>
      <Background />

      <Header opacity={headerIn} />

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "relative", width: 720, height: 560 }}>
          {/* Concentric pulses */}
          {[0, 1, 2].map((i) => {
            const t = interpolate(frame, [60 + i * 20, 180 + i * 20], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(...ease.editorial),
            });
            const size = 360 + t * 380;
            const opacity = (1 - t) * 0.5;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  width: size,
                  height: size,
                  marginLeft: -size / 2,
                  marginTop: -size / 2,
                  borderRadius: "50%",
                  border: `1px solid ${palette.accent}`,
                  opacity,
                }}
              />
            );
          })}

          {/* Shield */}
          <ShieldSvg progress={shieldDraw} />

          {/* Check icon inside shield */}
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: `translate(-50%, -50%) scale(${0.6 + 0.4 * checkAppear})`,
              opacity: checkAppear,
              fontFamily: fonts.sans,
              fontSize: 120,
              color: palette.accent,
              fontWeight: 700,
              lineHeight: 1,
            }}
          >
            ✓
          </div>
        </div>
      </AbsoluteFill>

      {/* Checklist on the right */}
      <div
        style={{
          position: "absolute",
          right: 120,
          top: "50%",
          transform: "translateY(-50%)",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {CHECKS.map((line, i) => {
          const showAt = 100 + i * 12;
          const t = interpolate(frame, [showAt, showAt + 20], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(...ease.brand),
          });
          return (
            <div
              key={i}
              style={{
                opacity: t,
                transform: `translateX(${(1 - t) * 20}px)`,
                display: "flex",
                alignItems: "center",
                gap: 12,
                backgroundColor: palette.surface,
                border: `1px solid ${palette.line}`,
                padding: "10px 16px",
                borderRadius: radius.sm,
                fontFamily: fonts.jp,
                fontSize: 16,
                color: palette.ink,
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  width: 18,
                  height: 18,
                  borderRadius: 18,
                  backgroundColor: palette.accent,
                  color: palette.surface,
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                ✓
              </span>
              {line}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const ShieldSvg: React.FC<{ progress: number }> = ({ progress }) => (
  <svg
    style={{
      position: "absolute",
      left: "50%",
      top: "50%",
      transform: "translate(-50%, -50%)",
    }}
    width={320}
    height={380}
    viewBox="0 0 320 380"
    fill="none"
  >
    <path
      d="M160 16 L40 60 L40 200 Q40 290 160 360 Q280 290 280 200 L280 60 Z"
      fill={palette.surface}
      stroke={palette.accent}
      strokeWidth={5}
      strokeDasharray="1400"
      strokeDashoffset={(1 - progress) * 1400}
      style={{ filter: `drop-shadow(0 12px 32px rgba(20,17,13,0.16))` }}
    />
  </svg>
);

const Header: React.FC<{ opacity: number }> = ({ opacity }) => (
  <div
    style={{
      position: "absolute",
      top: 96,
      left: 120,
      opacity,
      maxWidth: 600,
    }}
  >
    <div
      style={{
        fontFamily: fonts.mono,
        fontSize: 13,
        color: palette.muted,
        letterSpacing: "0.4em",
        textTransform: "uppercase",
        marginBottom: 10,
      }}
    >
      compliance posture
    </div>
    <div
      style={{
        fontFamily: fonts.jp,
        fontSize: 46,
        color: palette.ink,
        fontWeight: 700,
        letterSpacing: "-0.02em",
        lineHeight: 1.1,
      }}
    >
      ぜんぶ、<br />
      <span style={{ color: palette.accent }}>守る</span>前提で設計した。
    </div>
  </div>
);
