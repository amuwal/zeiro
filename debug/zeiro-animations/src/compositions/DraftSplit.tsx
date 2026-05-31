import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { Background } from '../common/Background';
import { ZEIRO_REPLY_LINES } from '../common/sampleEmails';
import { fonts } from '../fonts';
import { ease, palette, radius, shadow } from '../theme';

const Q_LINES = [
  '田中商事 田中様より',
  '',
  '源泉徴収票を再発行いただくこと、',
  '可能でしょうか。',
  '離職時の控えを紛失してしまい、',
  '確定申告に必要となっております。',
];

const TOTAL_Q = Q_LINES.join('\n').length;
const TOTAL_A = ZEIRO_REPLY_LINES.join('\n').length;

export const DraftSplit: React.FC = () => {
  const frame = useCurrentFrame();

  const qChars = Math.floor(
    interpolate(frame, [10, 90], [0, TOTAL_Q], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.bezier(...ease.editorial),
    }),
  );

  const aChars = Math.floor(
    interpolate(frame, [110, 260], [0, TOTAL_A], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.bezier(...ease.editorial),
    }),
  );

  const qText = Q_LINES.join('\n').slice(0, qChars);
  const aText = ZEIRO_REPLY_LINES.join('\n').slice(0, aChars);

  const cursorOn = Math.floor(frame / 8) % 2 === 0;

  return (
    <AbsoluteFill>
      <Background />
      <AbsoluteFill style={{ flexDirection: 'row', padding: '100px 80px', gap: 48 }}>
        <Panel
          title="お客様 — 受信"
          subtitle="2026-05-29 09:14"
          body={qText}
          cursor={qChars < TOTAL_Q ? cursorOn : false}
          tone="customer"
        />
        <Panel
          title="Zeiro — 下書き"
          subtitle="AI assisted · awaiting review"
          body={aText}
          cursor={aChars < TOTAL_A && frame > 110 ? cursorOn : false}
          tone="draft"
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Panel: React.FC<{
  title: string;
  subtitle: string;
  body: string;
  cursor: boolean;
  tone: 'customer' | 'draft';
}> = ({ title, subtitle, body, cursor, tone }) => {
  const accent = tone === 'draft' ? palette.accent : palette.muted;
  const bg = tone === 'draft' ? palette.surface : palette.surface2;
  return (
    <div
      style={{
        flex: 1,
        backgroundColor: bg,
        border: `1px solid ${palette.line}`,
        borderRadius: radius.lg,
        padding: '32px 36px',
        boxShadow: shadow.md,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <span style={{ width: 8, height: 8, borderRadius: 8, backgroundColor: accent }} />
        <span
          style={{
            fontFamily: fonts.mono,
            color: palette.muted,
            fontSize: 12,
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
          }}
        >
          {title}
        </span>
      </div>
      <div
        style={{
          fontFamily: fonts.mono,
          color: palette.muted2,
          fontSize: 12,
          marginBottom: 24,
          letterSpacing: '0.02em',
        }}
      >
        {subtitle}
      </div>
      <div
        style={{
          fontFamily: fonts.jp,
          color: palette.ink,
          fontSize: 22,
          lineHeight: 1.75,
          whiteSpace: 'pre-wrap',
          flex: 1,
        }}
      >
        {body}
        {cursor && (
          <span
            style={{
              display: 'inline-block',
              width: 10,
              height: 22,
              backgroundColor: tone === 'draft' ? palette.accent : palette.ink,
              transform: 'translateY(4px)',
              marginLeft: 2,
            }}
          />
        )}
      </div>
    </div>
  );
};
