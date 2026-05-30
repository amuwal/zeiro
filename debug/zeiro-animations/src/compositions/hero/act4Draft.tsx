import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { CITED_SOURCES, ZEIRO_REPLY_LINES } from "../../common/sampleEmails";
import { fonts } from "../../fonts";
import { ease, palette, radius, shadow } from "../../theme";

const REPLY = ZEIRO_REPLY_LINES.join("\n");
const TOTAL_CHARS = REPLY.length;

export const Act4Draft: React.FC = () => {
  const frame = useCurrentFrame();

  const chars = Math.floor(
    interpolate(frame, [10, 160], [0, TOTAL_CHARS], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(...ease.editorial),
    })
  );

  const headerIn = interpolate(frame, [0, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(...ease.brand),
  });

  const sendIn = interpolate(frame, [165, 195], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(...ease.pop),
  });

  const cursorOn = Math.floor(frame / 8) % 2 === 0;

  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 96, left: 120, opacity: headerIn }}>
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
          drafting · ground truth
        </div>
        <div
          style={{
            fontFamily: fonts.jp,
            fontSize: 52,
            color: palette.ink,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            lineHeight: 1.05,
          }}
        >
          引いた根拠から、<br />
          ことばを起こす。
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          right: 120,
          top: 220,
          width: 900,
          backgroundColor: palette.surface,
          border: `1px solid ${palette.line}`,
          borderRadius: radius.lg,
          padding: "32px 40px",
          boxShadow: shadow.lg,
          minHeight: 520,
        }}
      >
        <div
          style={{
            fontFamily: fonts.mono,
            fontSize: 12,
            color: palette.muted,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            marginBottom: 18,
          }}
        >
          to: 田中商事 田中様 · re: 源泉徴収票
        </div>
        <div
          style={{
            fontFamily: fonts.jp,
            fontSize: 22,
            color: palette.ink,
            lineHeight: 1.8,
            whiteSpace: "pre-wrap",
          }}
        >
          {REPLY.slice(0, chars)}
          {chars < TOTAL_CHARS && (
            <span
              style={{
                display: "inline-block",
                width: 9,
                height: 22,
                backgroundColor: palette.accent,
                transform: "translateY(4px)",
                opacity: cursorOn ? 1 : 0.2,
              }}
            />
          )}
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 24, flexWrap: "wrap" }}>
          {CITED_SOURCES.map((source, i) => {
            const showAt = 40 + i * 26;
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
                  transform: `translateY(${(1 - t) * 10}px) scale(${0.85 + 0.15 * t})`,
                  backgroundColor: palette.surface2,
                  border: `1px solid ${palette.line}`,
                  borderLeft: `3px solid ${source.color}`,
                  padding: "8px 12px",
                  borderRadius: radius.sm,
                  fontFamily: fonts.mono,
                  fontSize: 12,
                  color: palette.ink2,
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                }}
              >
                <span style={{ color: source.color, fontWeight: 700 }}>{source.id}</span>
                <span style={{ fontFamily: fonts.jp }}>{source.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Send button popping in at end */}
      <div
        style={{
          position: "absolute",
          right: 160,
          bottom: 140,
          opacity: sendIn,
          transform: `translateY(${(1 - sendIn) * 12}px) scale(${0.85 + 0.15 * sendIn})`,
        }}
      >
        <div
          style={{
            backgroundColor: palette.accent,
            color: palette.surface,
            fontFamily: fonts.jp,
            fontWeight: 700,
            fontSize: 22,
            padding: "16px 32px",
            borderRadius: 999,
            letterSpacing: "0.04em",
            boxShadow: "0 12px 28px -8px rgba(11, 78, 50, 0.4)",
          }}
        >
          ✓ 承認して送信
        </div>
      </div>
    </AbsoluteFill>
  );
};
