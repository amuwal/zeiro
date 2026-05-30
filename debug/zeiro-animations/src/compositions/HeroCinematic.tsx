import { AbsoluteFill, Sequence } from "remotion";
import { Background } from "../common/Background";
import { Act1Chaos } from "./hero/act1Chaos";
import { Act2Cut } from "./hero/act2Cut";
import { Act3Work } from "./hero/act3Work";
import { Act4Draft } from "./hero/act4Draft";
import { Act5Numbers } from "./hero/act5Numbers";
import { Act6Mark } from "./hero/act6Mark";

// 6-act hero piece, ~28 seconds at 30fps.
// Each act overlaps the next slightly via premount, so the cuts feel cinematic.
export const HeroCinematic: React.FC = () => {
  return (
    <AbsoluteFill>
      <Background />
      <Sequence durationInFrames={100}>
        <Act1Chaos />
      </Sequence>
      <Sequence from={95} durationInFrames={70} premountFor={20}>
        <Act2Cut />
      </Sequence>
      <Sequence from={160} durationInFrames={210} premountFor={20}>
        <Act3Work />
      </Sequence>
      <Sequence from={365} durationInFrames={220} premountFor={20}>
        <Act4Draft />
      </Sequence>
      <Sequence from={580} durationInFrames={120} premountFor={20}>
        <Act5Numbers />
      </Sequence>
      <Sequence from={695} durationInFrames={120} premountFor={20}>
        <Act6Mark />
      </Sequence>
    </AbsoluteFill>
  );
};
