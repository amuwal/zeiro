import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { EmailCard } from '../../common/EmailCard';
import { SAMPLE_EMAILS } from '../../common/sampleEmails';
import { fonts } from '../../fonts';
import { ease, palette, radius, shadow } from '../../theme';

// 0-180 frames: a single email card on the left enters the pipeline. The pipeline
// stations light in sequence (classify, retrieve, draft) and reasoning chips appear
// on the right. By the end the draft node is fully formed.

const STEPS = [
  { label: '分類', en: 'classify', ms: '申告 · 期限あり', color: 'oklch(52% 0.1 25)' },
  { label: '参照', en: 'retrieve', ms: 'K-21 / S-08 / C-12', color: 'oklch(48% 0.06 195)' },
  { label: '下書き', en: 'draft', ms: '確認待ち', color: 'oklch(38% 0.045 150)' },
];

export const Act3Work: React.FC = () => {
  const frame = useCurrentFrame();

  const cardIn = interpolate(frame, [0, 18], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(...ease.brand),
  });

  const headerIn = interpolate(frame, [0, 18], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(...ease.brand),
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
            marginBottom: 10,
          }}
        >
          working
        </div>
        <div
          style={{
            fontFamily: fonts.jp,
            fontSize: 56,
            color: palette.ink,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            lineHeight: 1.05,
          }}
        >
          1 通あたり、<span style={{ color: palette.accent }}>12 秒</span>。
        </div>
      </div>

      {/* Email card */}
      <div
        style={{
          position: 'absolute',
          left: 200,
          top: 380,
          opacity: cardIn,
          transform: `translateX(${(1 - cardIn) * -30}px)`,
        }}
      >
        <EmailCard data={SAMPLE_EMAILS[0]} width={440} emphasized />
      </div>

      {/* Arrow */}
      <Arrow
        x={680}
        y={460}
        t={interpolate(frame, [20, 50], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: Easing.bezier(...ease.brand),
        })}
      />

      {/* Reasoning steps */}
      <div
        style={{
          position: 'absolute',
          left: 820,
          top: 360,
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
        }}
      >
        {STEPS.map((s, i) => {
          const showAt = 30 + i * 30;
          const t = interpolate(frame, [showAt, showAt + 22], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: Easing.bezier(...ease.pop),
          });
          return (
            <div
              key={s.en}
              style={{
                opacity: t,
                transform: `translateX(${(1 - t) * 16}px)`,
                backgroundColor: palette.surface,
                border: `1px solid ${palette.line}`,
                borderLeft: `4px solid ${s.color}`,
                borderRadius: radius.md,
                padding: '14px 20px',
                boxShadow: shadow.sm,
                minWidth: 480,
                display: 'flex',
                alignItems: 'baseline',
                gap: 16,
              }}
            >
              <span
                style={{
                  fontFamily: fonts.jp,
                  fontSize: 22,
                  fontWeight: 700,
                  color: palette.ink,
                  letterSpacing: '-0.01em',
                }}
              >
                {s.label}
              </span>
              <span
                style={{
                  fontFamily: fonts.mono,
                  fontSize: 11,
                  color: palette.muted,
                  letterSpacing: '0.32em',
                  textTransform: 'uppercase',
                }}
              >
                {s.en}
              </span>
              <span
                style={{
                  marginLeft: 'auto',
                  fontFamily: fonts.jp,
                  fontSize: 15,
                  color: palette.ink2,
                }}
              >
                {s.ms}
              </span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const Arrow: React.FC<{ x: number; y: number; t: number }> = ({ x, y, t }) => (
  <svg style={{ position: 'absolute', left: x, top: y }} width={140} height={20}>
    <line x1={0} x2={140 * t} y1={10} y2={10} stroke={palette.muted} strokeWidth={2} />
    {t > 0.85 && <polygon points={`${140 - 10},2 140,10 ${140 - 10},18`} fill={palette.muted} />}
  </svg>
);
