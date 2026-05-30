import { fonts } from "../fonts";
import { palette, radius, shadow } from "../theme";

export type PipelineNode = {
  index: string;
  title: string;
  subtitle: string;
};

type Props = {
  node: PipelineNode;
  x: number;
  y: number;
  z: number;
  rise: number;
  active: number;
  done: boolean;
};

// A camera-facing slab. Depth comes purely from translate3d(z) under the
// stage's perspective — no rotateX/Y, so text stays crisp. A darker duplicate
// sits a few px behind to fake card thickness.
export const AgentPipelineNode: React.FC<Props> = ({
  node,
  x,
  y,
  z,
  rise,
  active,
  done,
}) => {
  const pop = 1 + 0.05 * active;
  const lift = (1 - rise) * 60;
  const border = active > 0.5 ? palette.accent : palette.line;
  const glow =
    active > 0
      ? `${shadow.lg}, 0 0 0 ${active * 3}px ${palette.accentSoft}, 0 0 ${
          active * 56
        }px ${active * 10}px rgba(36, 78, 52, ${0.16 * active})`
      : shadow.lg;

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translate(-50%, -50%) translate3d(0, ${lift}px, ${z}px) scale(${pop})`,
        opacity: rise,
        transformStyle: "preserve-3d",
      }}
    >
      {/* thickness slab behind */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: "translate3d(7px, 9px, -14px)",
          backgroundColor: palette.bg2,
          borderRadius: radius.lg,
          border: `1px solid ${palette.line}`,
        }}
      />
      <div
        style={{
          position: "relative",
          width: 288,
          padding: "24px 26px",
          backgroundColor: palette.surface,
          border: `1.5px solid ${border}`,
          borderRadius: radius.lg,
          boxShadow: glow,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              fontFamily: fonts.mono,
              fontSize: 22,
              fontWeight: 700,
              color: active > 0.5 ? palette.accentInk : palette.muted2,
              letterSpacing: "0.04em",
            }}
          >
            {node.index}
          </div>
          <div
            style={{
              width: 30,
              height: 1,
              backgroundColor: active > 0.5 ? palette.accent : palette.line,
            }}
          />
          <div
            style={{
              marginLeft: "auto",
              width: 10,
              height: 10,
              borderRadius: "50%",
              backgroundColor: active > 0.5 ? palette.accent : palette.lineStrong,
              boxShadow:
                active > 0.5
                  ? `0 0 0 ${4 * active}px ${palette.accentSoft}`
                  : "none",
            }}
          />
        </div>

        <div
          style={{
            marginTop: 16,
            fontFamily: fonts.jp,
            fontSize: 34,
            fontWeight: 700,
            color: palette.ink,
            letterSpacing: "-0.01em",
            lineHeight: 1.1,
            whiteSpace: "nowrap",
          }}
        >
          {node.title}
        </div>

        <div
          style={{
            marginTop: 12,
            fontFamily: fonts.mono,
            fontSize: 12.5,
            fontWeight: 500,
            color: active > 0.3 ? palette.accentInk : palette.muted,
            letterSpacing: "0.12em",
            opacity: 0.4 + 0.6 * active,
            whiteSpace: "nowrap",
          }}
        >
          {node.subtitle}
        </div>

        {done && (
          <div
            style={{
              position: "absolute",
              top: -16,
              right: -12,
              padding: "7px 14px",
              borderRadius: 999,
              backgroundColor: palette.accent,
              color: palette.surface,
              fontFamily: fonts.mono,
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.1em",
              boxShadow: shadow.md,
              whiteSpace: "nowrap",
            }}
          >
            完了 ✓
          </div>
        )}
      </div>
    </div>
  );
};
