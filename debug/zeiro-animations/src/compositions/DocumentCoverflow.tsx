import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { Background } from "../common/Background";
import { SAMPLE_EMAILS } from "../common/sampleEmails";
import { ease } from "../theme";
import { CARD_H, CoverflowCenter } from "./CoverflowCenter";
import { CoverflowCard, SIDE_W } from "./CoverflowCard";
import { GlossyFloor, Overlay, placement, Reflection, ROW_Y } from "./CoverflowScene";

const SIDE_EMAILS = [
  SAMPLE_EMAILS[7], // 国税庁 e-Tax
  SAMPLE_EMAILS[0], // 田中商事 源泉徴収票
  SAMPLE_EMAILS[1], // 佐藤工業 消費税
  SAMPLE_EMAILS[3], // 西村法律事務所 顧問契約
  SAMPLE_EMAILS[10], // 森田税務署 実地調査
  SAMPLE_EMAILS[11], // 渡辺コンサル 事業承継
];

type Placed = { content: React.ReactNode; slot: number; isCenter: boolean; h: number };

export const DocumentCoverflow: React.FC = () => {
  const frame = useCurrentFrame();

  const fanIn = interpolate(frame, [0, 40], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(...ease.brand),
  });
  const advance = interpolate(frame, [50, 110], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(...ease.editorial),
  });
  const flip = interpolate(frame, [120, 180], [0, 180], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(...ease.editorial),
  });
  const headIn = interpolate(frame, [6, 34], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(...ease.brand),
  });
  const pill = interpolate(frame, [196, 224], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(...ease.pop),
  });

  // Gentle one-slot advance (50-110): the deck rolls right ~half a slot while the
  // hero flip card holds the center so it can turn over in place.
  const drift = advance * 0.5;

  const cards: Placed[] = [
    { content: <CoverflowCenter flip={flip} />, slot: 0, isCenter: true, h: CARD_H },
  ];
  SIDE_EMAILS.forEach((data, i) => {
    const baseSlot = (i < 3 ? i - 3 : i - 2) + drift;
    cards.push({
      content: <CoverflowCard data={data} dim={Math.min(Math.abs(baseSlot), 1.4)} />,
      slot: baseSlot,
      isCenter: false,
      h: 430,
    });
  });

  const placed = cards
    .map((c, idx) => {
      const p = placement(c.slot);
      const w = c.isCenter ? 460 : SIDE_W;
      const enterT = interpolate(fanIn, [Math.min(idx * 0.07, 0.5), 1], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
      const flatRot = c.isCenter ? 0 : (1 - enterT) * -Math.sign(c.slot) * 10;
      return { ...c, p, w, enterT, flatRot, idx };
    })
    .sort((a, b) => a.p.z - b.p.z);

  return (
    <AbsoluteFill>
      <Background variant="surface" />
      <GlossyFloor />

      <AbsoluteFill style={{ perspective: 1800, perspectiveOrigin: "50% 38%" }}>
        <div style={{ position: "absolute", inset: 0, transformStyle: "preserve-3d" }}>
          {placed.map((c) => (
            <div
              key={c.idx}
              style={{
                position: "absolute",
                left: c.p.x - c.w / 2,
                top: ROW_Y - (1 - c.enterT) * 40,
                transformStyle: "preserve-3d",
                transform: `translateZ(${c.p.z}px) rotateY(${c.p.rotY + c.flatRot}deg) scale(${c.p.scale})`,
                opacity: c.enterT,
                zIndex: c.isCenter ? 50 : 10 + Math.round(c.p.z),
              }}
            >
              {c.content}
              {!c.isCenter && <Reflection h={c.h}>{c.content}</Reflection>}
            </div>
          ))}
        </div>
      </AbsoluteFill>

      <Overlay headIn={headIn} pill={pill} />
    </AbsoluteFill>
  );
};
