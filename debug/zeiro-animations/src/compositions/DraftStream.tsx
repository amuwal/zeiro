import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { Background } from "../common/Background";
import { CITED_SOURCES, ZEIRO_REPLY_LINES } from "../common/sampleEmails";
import { fonts } from "../fonts";
import { ease, palette, radius, shadow } from "../theme";

// Stream-style: tokens land word-by-word into a card, and citation chips pop in at
// specific moments to ground the draft. Highlights what makes the agent trustworthy.
const REPLY = ZEIRO_REPLY_LINES.join("\n");
const TOKENS = REPLY.split(/(\s+)/).filter(Boolean);

const CITATION_AT_TOKEN: Record<number, number> = {
  9: 0,
  20: 1,
  28: 2,
};

export const DraftStream: React.FC = () => {
  const frame = useCurrentFrame();

  const tokenCount = Math.floor(
    interpolate(frame, [15, 210], [0, TOKENS.length], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(...ease.editorial),
    })
  );

  const headerIn = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(...ease.brand),
  });

  return (
    <AbsoluteFill>
      <Background />
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          padding: "80px",
        }}
      >
        <div style={{ width: 980, opacity: headerIn }}>
          <div
            style={{
              fontFamily: fonts.mono,
              color: palette.muted,
              fontSize: 13,
              letterSpacing: "0.32em",
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            Drafting reply · zeiro.agent.draft@v1
          </div>
          <div
            style={{
              fontFamily: fonts.jp,
              color: palette.ink,
              fontSize: 42,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              marginBottom: 32,
            }}
          >
            根拠を引きながら、書く。
          </div>

          <div
            style={{
              backgroundColor: palette.surface,
              border: `1px solid ${palette.line}`,
              borderRadius: radius.lg,
              padding: "32px 40px",
              boxShadow: shadow.md,
              minHeight: 380,
              fontFamily: fonts.jp,
              fontSize: 22,
              color: palette.ink,
              lineHeight: 1.8,
              position: "relative",
            }}
          >
            {TOKENS.slice(0, tokenCount).map((tok, i) => {
              const isNewline = tok === "\n";
              if (isNewline) return <br key={i} />;
              return (
                <TokenSpan key={i} text={tok} appearedAtFrame={15 + i * 5} frame={frame} />
              );
            })}
            {tokenCount < TOKENS.length && (
              <span
                style={{
                  display: "inline-block",
                  width: 9,
                  height: 22,
                  backgroundColor: palette.accent,
                  transform: "translateY(4px)",
                  opacity: Math.floor(frame / 7) % 2 === 0 ? 1 : 0.2,
                }}
              />
            )}
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 24, flexWrap: "wrap" }}>
            {CITED_SOURCES.map((source, i) => {
              const triggerFrame = Object.entries(CITATION_AT_TOKEN).find(
                ([, idx]) => idx === i
              )?.[0];
              const showAt = triggerFrame ? 15 + Number(triggerFrame) * 5 : 60 + i * 20;
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
                    backgroundColor: palette.surface2,
                    border: `1px solid ${palette.line}`,
                    borderLeft: `3px solid ${source.color}`,
                    padding: "10px 14px",
                    borderRadius: radius.sm,
                    fontFamily: fonts.mono,
                    fontSize: 13,
                    color: palette.ink2,
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
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const TokenSpan: React.FC<{ text: string; appearedAtFrame: number; frame: number }> = ({
  text,
  appearedAtFrame,
  frame,
}) => {
  const t = interpolate(frame, [appearedAtFrame, appearedAtFrame + 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(...ease.brand),
  });
  return (
    <span style={{ opacity: t, display: "inline" }}>
      {text}
    </span>
  );
};
