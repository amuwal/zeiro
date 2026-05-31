import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { Background } from '../common/Background';
import { EmailCard } from '../common/EmailCard';
import { SAMPLE_EMAILS } from '../common/sampleEmails';
import { fonts } from '../fonts';
import { ease, palette } from '../theme';

// Phase 1 (0-30f): cards drift in scattered from off-screen at random angles, chaotic.
// Phase 2 (30-70f): they magnetise into a clean vertical stack on the right.
// Phase 3 (70-end): the header on the left wipes in.
export const InboxCascade: React.FC = () => {
  const frame = useCurrentFrame();
  const cards = SAMPLE_EMAILS.slice(0, 7);

  const sortStart = 32;
  const sortEnd = 78;

  const headerIn = interpolate(frame, [70, 105], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(...ease.brand),
  });

  return (
    <AbsoluteFill>
      <Background />
      <AbsoluteFill style={{ flexDirection: 'row' }}>
        <LeftHeader progress={headerIn} count={cards.length} />
        <div style={{ flex: 1, position: 'relative' }}>
          {cards.map((email, i) => {
            const enter = interpolate(frame, [i * 3, i * 3 + 18], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
              easing: Easing.bezier(...ease.crisp),
            });
            const sort = interpolate(frame, [sortStart + i * 2, sortEnd + i * 2], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
              easing: Easing.bezier(...ease.brand),
            });

            const chaosX = CHAOS[i].x;
            const chaosY = CHAOS[i].y;
            const chaosRot = CHAOS[i].rot;

            const orderY = -260 + i * 96;

            const x = (1 - sort) * chaosX;
            const y = chaosY + (orderY - chaosY) * sort;
            const rot = chaosRot * (1 - sort);
            const scale = 0.92 + 0.08 * sort;

            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) rotate(${rot}deg) scale(${scale})`,
                  opacity: enter,
                  transition: 'none',
                }}
              >
                <EmailCard data={email} width={420} emphasized={sort > 0.85} />
              </div>
            );
          })}

          <SortPulse frame={frame} sortStart={sortStart} sortEnd={sortEnd} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const CHAOS = [
  { x: -260, y: -180, rot: -8 },
  { x: 240, y: -240, rot: 11 },
  { x: -340, y: 60, rot: -14 },
  { x: 300, y: 40, rot: 7 },
  { x: -200, y: 220, rot: 5 },
  { x: 260, y: 240, rot: -9 },
  { x: 0, y: -40, rot: 3 },
];

const LeftHeader: React.FC<{ progress: number; count: number }> = ({ progress, count }) => (
  <div
    style={{
      width: 540,
      padding: '120px 64px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      gap: 16,
    }}
  >
    <div
      style={{
        opacity: progress,
        transform: `translateY(${(1 - progress) * 16}px)`,
        fontFamily: fonts.mono,
        color: palette.muted,
        fontSize: 13,
        letterSpacing: '0.32em',
        textTransform: 'uppercase',
      }}
    >
      Inbox · 09:14
    </div>
    <div
      style={{
        opacity: progress,
        transform: `translateY(${(1 - progress) * 24}px)`,
        fontFamily: fonts.jp,
        color: palette.ink,
        fontSize: 64,
        lineHeight: 1.05,
        fontWeight: 700,
        letterSpacing: '-0.02em',
      }}
    >
      {count} 通の問い合わせ、
      <br />
      <span style={{ color: palette.accent }}>整理完了</span>。
    </div>
    <div
      style={{
        opacity: progress * 0.85,
        transform: `translateY(${(1 - progress) * 14}px)`,
        fontFamily: fonts.sans,
        color: palette.muted,
        fontSize: 18,
        marginTop: 8,
      }}
    >
      Zeiro が分類し、優先順位を付けました。
    </div>
  </div>
);

const SortPulse: React.FC<{ frame: number; sortStart: number; sortEnd: number }> = ({
  frame,
  sortStart,
  sortEnd,
}) => {
  const t = interpolate(frame, [sortStart, sortEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const radius = 24 + t * 600;
  const opacity = (1 - t) * 0.5;
  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: radius,
        height: radius,
        marginLeft: -radius / 2,
        marginTop: -radius / 2,
        border: `2px solid ${palette.accent}`,
        borderRadius: '50%',
        opacity,
      }}
    />
  );
};
