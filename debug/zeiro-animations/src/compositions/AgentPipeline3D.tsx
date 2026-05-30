import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { Background } from "../common/Background";
import { ease } from "../theme";
import { AgentPipelineNode, type PipelineNode } from "./AgentPipelineNode";
import { Edge, Overlays } from "./AgentPipelineParts";

type Placed = PipelineNode & { x: number; y: number; z: number };

const NODES: Placed[] = [
  { index: "01", title: "受信", subtitle: "INBOX · 142 件の未読", x: 330, y: 778, z: 200 },
  { index: "02", title: "分類", subtitle: "CLASSIFY · Gemini Flash", x: 630, y: 650, z: 100 },
  { index: "03", title: "検索", subtitle: "RETRIEVE · 6 ソース · pgvector", x: 930, y: 522, z: 0 },
  { index: "04", title: "下書き", subtitle: "DRAFT · Claude · 引用付き", x: 1230, y: 400, z: -100 },
  { index: "05", title: "レビュー", subtitle: "APPROVE · 人が承認して送信", x: 1530, y: 300, z: -200 },
];

const STAGGER = 9;
const PULSE_START = 40;
const PULSE_STEP = 38;

export const AgentPipeline3D: React.FC = () => {
  const frame = useCurrentFrame();

  const rise = (i: number) =>
    interpolate(frame, [i * STAGGER, i * STAGGER + 34], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(...ease.brand),
    });

  const activation = (i: number) =>
    interpolate(
      frame,
      [PULSE_START + i * PULSE_STEP, PULSE_START + i * PULSE_STEP + 18],
      [0, 1],
      {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.bezier(...ease.pop),
      },
    );

  const overlayIn = interpolate(frame, [0, 26], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(...ease.brand),
  });

  const doneAt = PULSE_START + 4 * PULSE_STEP + 12;

  return (
    <AbsoluteFill>
      <Background variant="cream" />

      <Overlays opacity={overlayIn} />

      <AbsoluteFill style={{ perspective: 1800, perspectiveOrigin: "50% 50%" }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            transformStyle: "preserve-3d",
          }}
        >
          {NODES.slice(0, -1).map((a, i) => {
            const b = NODES[i + 1];
            const travel = interpolate(
              frame,
              [PULSE_START + i * PULSE_STEP, PULSE_START + (i + 1) * PULSE_STEP],
              [0, 1],
              {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(...ease.inOut),
              },
            );
            return (
              <Edge
                key={a.index}
                a={a}
                b={b}
                fill={activation(i)}
                travel={travel}
              />
            );
          })}

          {NODES.map((node, i) => (
            <AgentPipelineNode
              key={node.index}
              node={node}
              x={node.x}
              y={node.y}
              z={node.z}
              rise={rise(i)}
              active={activation(i)}
              done={i === 4 && frame >= doneAt}
            />
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
