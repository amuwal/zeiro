import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { Background } from "../common/Background";
import { fonts } from "../fonts";
import { ease, palette } from "../theme";
import { AreaSpark, StatTiles } from "./TimeReclaimedCharts";
import { BeforeAfter, HeroDonut, Panel } from "./TimeReclaimedPanels";

const eb = (
  f: number,
  a: number,
  b: number,
  from: number,
  to: number,
  e: readonly [number, number, number, number] = ease.brand,
) =>
  interpolate(f, [a, b], [from, to], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(...e),
  });

export const TimeReclaimed: React.FC = () => {
  const frame = useCurrentFrame();
  const headIn = eb(frame, 0, 34, 0, 1);
  const boardIn = eb(frame, 14, 50, 0, 1, ease.editorial);

  return (
    <AbsoluteFill>
      <Background variant="cream" />

      <AbsoluteFill style={{ padding: "112px 120px 0", boxSizing: "border-box" }}>
        <div style={{ opacity: headIn, transform: `translateY(${(1 - headIn) * 16}px)` }}>
          <div
            style={{
              fontFamily: fonts.mono,
              fontSize: 13,
              color: palette.muted2,
              letterSpacing: "0.4em",
              textTransform: "uppercase",
            }}
          >
            THE NUMBERS · 月次
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 22, marginTop: 12 }}>
            <div
              style={{
                fontFamily: fonts.jp,
                fontSize: 52,
                fontWeight: 700,
                color: palette.ink,
                letterSpacing: "-0.02em",
                whiteSpace: "nowrap",
              }}
            >
              数字で見る、Zeiro。
            </div>
            <div
              style={{
                fontFamily: fonts.mono,
                fontSize: 13,
                color: palette.muted,
                letterSpacing: "0.08em",
                whiteSpace: "nowrap",
              }}
            >
              1 事務所あたりの平均値 · 直近 30 日
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 40,
            flex: 1,
            perspective: "1400px",
            perspectiveOrigin: "50% 30%",
            opacity: boardIn,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "640px 1fr",
              gridTemplateRows: "auto auto auto",
              gridTemplateAreas: `"donut before" "donut area" "tiles tiles"`,
              gap: 26,
              transformStyle: "preserve-3d",
              transform: "rotateX(3deg)",
              height: "100%",
            }}
          >
            <div style={{ gridArea: "donut" }}>
              <Panel z={0} delay={26}>
                <HeroDonut />
              </Panel>
            </div>
            <div style={{ gridArea: "before" }}>
              <Panel z={40} delay={44}>
                <BeforeAfter />
              </Panel>
            </div>
            <div style={{ gridArea: "area" }}>
              <Panel z={20} delay={62}>
                <AreaSpark />
              </Panel>
            </div>
            <div style={{ gridArea: "tiles" }}>
              <Panel z={30} delay={80} pad={0}>
                <div style={{ padding: 8 }}>
                  <StatTiles />
                </div>
              </Panel>
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
