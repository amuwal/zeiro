import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { EmailCard } from '../../common/EmailCard';
import { SAMPLE_EMAILS } from '../../common/sampleEmails';
import { fonts } from '../../fonts';
import { ease, palette } from '../../theme';

// 0-90 frames: emails fly in from outside the canvas, tilted, fast, overlapping —
// the "before zeiro" feeling. Headline lingers at top-left.

const SCATTER = [
  { x: -520, y: -260, rot: -8, delay: 0, scale: 0.95 },
  { x: 520, y: -240, rot: 6, delay: 4, scale: 1 },
  { x: -460, y: 60, rot: -12, delay: 7, scale: 0.92 },
  { x: 480, y: 80, rot: 9, delay: 10, scale: 0.9 },
  { x: -280, y: 280, rot: 4, delay: 13, scale: 0.92 },
  { x: 320, y: 280, rot: -6, delay: 16, scale: 0.95 },
  { x: 60, y: -300, rot: 3, delay: 19, scale: 0.9 },
  { x: -40, y: 60, rot: -3, delay: 22, scale: 0.92 },
  { x: 200, y: -60, rot: -7, delay: 25, scale: 0.88 },
  { x: -220, y: -40, rot: 11, delay: 28, scale: 0.9 },
];

export const Act1Chaos: React.FC = () => {
  const frame = useCurrentFrame();
  const cards = SAMPLE_EMAILS.slice(0, SCATTER.length);

  const headerIn = interpolate(frame, [0, 22], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(...ease.brand),
  });

  // Whole composition shakes out near the end as zeiro "cuts" the chaos.
  const exitT = interpolate(frame, [70, 95], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(...ease.editorial),
  });

  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', top: 96, left: 120, opacity: headerIn }}>
        <div
          style={{
            fontFamily: fonts.mono,
            fontSize: 13,
            color: palette.muted,
            letterSpacing: '0.4em',
            textTransform: 'uppercase',
            marginBottom: 12,
          }}
        >
          before · 09:00
        </div>
        <div
          style={{
            fontFamily: fonts.jp,
            fontSize: 64,
            color: palette.ink,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            lineHeight: 1.05,
            maxWidth: 1400,
          }}
        >
          月曜日。
          <br />
          未読は、<span style={{ color: palette.urgent }}>142 件</span>。
        </div>
      </div>

      {cards.map((email, i) => {
        const s = SCATTER[i];
        const t = interpolate(frame, [s.delay, s.delay + 18], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: Easing.bezier(...ease.crisp),
        });
        const enterX = s.x * 1.5 * (1 - t);
        const enterY = s.y - 200 * (1 - t);
        const exitOpacity = 1 - exitT * 0.6;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: '50%',
              top: '55%',
              transform: `translate(calc(-50% + ${s.x + enterX}px), calc(-50% + ${enterY}px)) rotate(${s.rot}deg) scale(${s.scale})`,
              opacity: t * exitOpacity,
            }}
          >
            <EmailCard data={email} width={400} />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
