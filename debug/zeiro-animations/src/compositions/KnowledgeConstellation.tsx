import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { Background } from "../common/Background";
import { CITED_SOURCES } from "../common/sampleEmails";
import { fonts } from "../fonts";
import { ease, palette, radius, shadow } from "../theme";

// A central "draft" node sits in the middle. Around it, knowledge cards orbit at
// fixed positions and connect to the draft via thin lines that draw in over time.
// Each line lights up with a citation chip when it lands.

type Node = {
  label: string;
  source: string;
  angle: number;
  radius: number;
  color: string;
  ref: string;
};

const NODES: Node[] = [
  { label: "顧問契約書", source: "internal · v3", angle: -170, radius: 520, color: "oklch(48% 0.06 195)", ref: "S-08 §4.2" },
  { label: "国税庁 質疑応答", source: "external · gov.jp", angle: -120, radius: 440, color: "oklch(52% 0.1 25)", ref: "K-21 No.4117" },
  { label: "過去メール", source: "internal · 2024-09", angle: -45, radius: 460, color: "oklch(45% 0.08 295)", ref: "C-12" },
  { label: "電子帳簿保存法", source: "external · law", angle: 25, radius: 520, color: "oklch(58% 0.1 70)", ref: "L-04 §7" },
  { label: "前回の決算書", source: "internal · 2025-03", angle: 115, radius: 380, color: "oklch(48% 0.06 195)", ref: "F-19" },
  { label: "業界ガイドライン", source: "external · jaai", angle: 175, radius: 520, color: "oklch(45% 0.08 295)", ref: "G-02" },
];

export const KnowledgeConstellation: React.FC = () => {
  const frame = useCurrentFrame();

  const headerIn = interpolate(frame, [0, 24], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(...ease.brand),
  });

  const draftIn = interpolate(frame, [20, 50], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(...ease.pop),
  });

  const centerX = 960;
  const centerY = 620;

  return (
    <AbsoluteFill>
      <Background variant="ink" />

      <Header opacity={headerIn} />

      {/* Subtle radial gridlines */}
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: centerX - i * 180,
            top: centerY - i * 180,
            width: i * 360,
            height: i * 360,
            borderRadius: "50%",
            border: `1px solid ${palette.muted}`,
            opacity: 0.12,
          }}
        />
      ))}

      <svg
        width={1920}
        height={1080}
        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      >
        {NODES.map((node, i) => {
          const angleR = (node.angle * Math.PI) / 180;
          const x = centerX + Math.cos(angleR) * node.radius;
          const y = centerY + Math.sin(angleR) * node.radius;
          const start = 50 + i * 15;
          const t = interpolate(frame, [start, start + 30], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(...ease.brand),
          });
          return (
            <line
              key={i}
              x1={x}
              y1={y}
              x2={x + (centerX - x) * t}
              y2={y + (centerY - y) * t}
              stroke={node.color}
              strokeWidth={2}
              strokeDasharray="6 8"
              opacity={0.85 * t}
            />
          );
        })}
      </svg>

      {NODES.map((node, i) => {
        const angleR = (node.angle * Math.PI) / 180;
        const x = centerX + Math.cos(angleR) * node.radius;
        const y = centerY + Math.sin(angleR) * node.radius;
        const start = 30 + i * 12;
        const t = interpolate(frame, [start, start + 22], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(...ease.brand),
        });
        return (
          <KnowledgeCard
            key={i}
            node={node}
            x={x}
            y={y}
            t={t}
          />
        );
      })}

      {/* Central draft node */}
      <div
        style={{
          position: "absolute",
          left: centerX,
          top: centerY,
          transform: `translate(-50%, -50%) scale(${0.85 + 0.15 * draftIn})`,
          opacity: draftIn,
        }}
      >
        <div
          style={{
            backgroundColor: palette.surface,
            border: `2px solid ${palette.accent}`,
            borderRadius: radius.lg,
            padding: "26px 34px",
            boxShadow: `0 24px 60px -16px rgba(0,0,0,0.35), 0 0 0 ${draftIn * 12}px rgba(11, 78, 50, 0.14)`,
            fontFamily: fonts.jp,
            fontSize: 28,
            fontWeight: 700,
            color: palette.ink,
            letterSpacing: "-0.01em",
            minWidth: 320,
            textAlign: "center",
          }}
        >
          下書き
          <div
            style={{
              fontFamily: fonts.mono,
              fontSize: 12,
              color: palette.accent,
              letterSpacing: "0.32em",
              textTransform: "uppercase",
              marginTop: 8,
              fontWeight: 500,
            }}
          >
            zeiro · grounded
          </div>
        </div>
      </div>

      {/* Citation chips along the bottom */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 80,
          display: "flex",
          justifyContent: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        {CITED_SOURCES.map((source, i) => {
          const showAt = 160 + i * 14;
          const t = interpolate(frame, [showAt, showAt + 18], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(...ease.pop),
          });
          return (
            <div
              key={source.id}
              style={{
                opacity: t,
                transform: `translateY(${(1 - t) * 12}px) scale(${0.85 + 0.15 * t})`,
                backgroundColor: palette.ink2,
                border: `1px solid ${source.color}`,
                borderLeft: `3px solid ${source.color}`,
                padding: "10px 14px",
                borderRadius: radius.sm,
                fontFamily: fonts.mono,
                fontSize: 13,
                color: palette.bg,
                display: "flex",
                gap: 10,
                alignItems: "center",
              }}
            >
              <span style={{ color: source.color, fontWeight: 700 }}>{source.id}</span>
              <span style={{ fontFamily: fonts.jp }}>{source.label}</span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const KnowledgeCard: React.FC<{ node: Node; x: number; y: number; t: number }> = ({
  node,
  x,
  y,
  t,
}) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      transform: `translate(-50%, -50%) scale(${0.8 + 0.2 * t})`,
      opacity: t,
      backgroundColor: palette.surface,
      border: `1px solid ${node.color}`,
      borderRadius: radius.md,
      padding: "10px 14px",
      boxShadow: shadow.md,
      fontFamily: fonts.jp,
      color: palette.ink,
      minWidth: 180,
    }}
  >
    <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.005em" }}>{node.label}</div>
    <div
      style={{
        fontFamily: fonts.mono,
        fontSize: 11,
        color: palette.muted,
        letterSpacing: "0.18em",
        marginTop: 4,
      }}
    >
      {node.source}
    </div>
    <div
      style={{
        marginTop: 6,
        fontFamily: fonts.mono,
        fontSize: 11,
        color: node.color,
        fontWeight: 700,
        letterSpacing: "0.08em",
      }}
    >
      {node.ref}
    </div>
  </div>
);

const Header: React.FC<{ opacity: number }> = ({ opacity }) => (
  <div
    style={{
      position: "absolute",
      top: 80,
      left: 0,
      right: 0,
      textAlign: "center",
      opacity,
    }}
  >
    <div
      style={{
        fontFamily: fonts.mono,
        fontSize: 13,
        color: palette.muted2,
        letterSpacing: "0.4em",
        textTransform: "uppercase",
        marginBottom: 10,
      }}
    >
      retrieval · 6 sources · 0 hallucination
    </div>
    <div
      style={{
        fontFamily: fonts.jp,
        fontSize: 46,
        color: palette.bg,
        fontWeight: 700,
        letterSpacing: "-0.02em",
      }}
    >
      引いてから、書く。
    </div>
  </div>
);
