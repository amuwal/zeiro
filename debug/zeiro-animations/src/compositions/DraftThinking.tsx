import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { Background } from "../common/Background";
import { fonts } from "../fonts";
import { ease, palette, radius, shadow } from "../theme";

const REASONING_STEPS = [
  "顧客カテゴリを確認 → 顧問契約あり",
  "過去メールを検索 → 2024-09 の同種依頼",
  "国税庁 質疑応答を参照 → No.4117 を引用",
  "守秘情報をマスク → マイナンバー 1 件",
  "下書きを生成",
];

const FINAL_LINE = "本日中に PDF にて再発行いたします。";

export const DraftThinking: React.FC = () => {
  const frame = useCurrentFrame();

  const headerIn = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(...ease.brand),
  });

  const finalT = interpolate(frame, [170, 230], [0, 1], {
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
          padding: 80,
        }}
      >
        <div
          style={{
            width: 980,
            opacity: headerIn,
            transform: `translateY(${(1 - headerIn) * 12}px)`,
          }}
        >
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
            Reasoning trace · then write
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
            考えてから、書く。
          </div>

          <div
            style={{
              backgroundColor: palette.surface,
              border: `1px solid ${palette.line}`,
              borderRadius: radius.lg,
              padding: 36,
              boxShadow: shadow.md,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 28 }}>
              {REASONING_STEPS.map((step, i) => {
                const showAt = 25 + i * 28;
                const tAppear = interpolate(frame, [showAt, showAt + 14], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                  easing: Easing.bezier(...ease.brand),
                });
                const tCheck = interpolate(frame, [showAt + 14, showAt + 22], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                  easing: Easing.bezier(...ease.pop),
                });
                return (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      opacity: tAppear,
                      transform: `translateY(${(1 - tAppear) * 8}px)`,
                    }}
                  >
                    <div
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 22,
                        backgroundColor: tCheck > 0.5 ? palette.accent : palette.surface2,
                        border: `1px solid ${tCheck > 0.5 ? palette.accent : palette.line}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: palette.surface,
                        fontSize: 14,
                        fontWeight: 700,
                      }}
                    >
                      {tCheck > 0.5 ? "✓" : ""}
                    </div>
                    <div
                      style={{
                        fontFamily: fonts.mono,
                        fontSize: 16,
                        color: palette.ink2,
                        letterSpacing: "0.01em",
                      }}
                    >
                      {step}
                    </div>
                  </div>
                );
              })}
            </div>

            <div
              style={{
                borderTop: `1px solid ${palette.line}`,
                paddingTop: 24,
                opacity: finalT,
                transform: `translateY(${(1 - finalT) * 16}px)`,
              }}
            >
              <div
                style={{
                  fontFamily: fonts.mono,
                  color: palette.accent,
                  fontSize: 12,
                  letterSpacing: "0.28em",
                  textTransform: "uppercase",
                  marginBottom: 12,
                }}
              >
                Draft
              </div>
              <div
                style={{
                  fontFamily: fonts.jp,
                  color: palette.ink,
                  fontSize: 28,
                  fontWeight: 600,
                  letterSpacing: "-0.01em",
                  lineHeight: 1.6,
                }}
              >
                {FINAL_LINE}
              </div>
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
