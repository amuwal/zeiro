import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { Background } from '../common/Background';
import { EmailCard } from '../common/EmailCard';
import { SAMPLE_EMAILS } from '../common/sampleEmails';
import { fonts } from '../fonts';
import { ease, palette, radius, shadow } from '../theme';

// Lateral conveyor: raw emails flow in from the left, pass through 3 stations
// (Classify · Retrieve · Draft), and emerge on the right as ready-to-send replies.
const STATIONS = [
  { id: 'classify', label: '分類', en: 'CLASSIFY', x: 0.28 },
  { id: 'retrieve', label: '参照', en: 'RETRIEVE', x: 0.5 },
  { id: 'draft', label: '下書き', en: 'DRAFT', x: 0.72 },
] as const;

export const InboxPipeline: React.FC = () => {
  const frame = useCurrentFrame();
  const cards = SAMPLE_EMAILS.slice(0, 5);

  return (
    <AbsoluteFill>
      <Background />

      <ConveyorLine />

      {STATIONS.map((s, i) => {
        const t = interpolate(frame, [12 + i * 6, 36 + i * 6], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: Easing.bezier(...ease.brand),
        });
        return <Station key={s.id} station={s} t={t} />;
      })}

      {cards.map((email, i) => {
        const start = 30 + i * 22;
        const localFrame = frame - start;
        const totalTravel = 160;
        const progress = Math.max(0, Math.min(1, localFrame / totalTravel));
        // Travel from 5% to 92% of the canvas so the reply badge stays fully in view.
        const x = interpolate(progress, [0, 1], [0.05, 0.92]);
        const out = progress > 0.95 ? interpolate(progress, [0.95, 1], [1, 0]) : 1;
        return (
          <CardOnBelt
            key={i}
            email={email}
            x={x}
            opacity={localFrame > 0 ? out : 0}
            stationsCleared={progress}
          />
        );
      })}

      <Header />
    </AbsoluteFill>
  );
};

const ConveyorLine: React.FC = () => (
  <div
    style={{
      position: 'absolute',
      top: '50%',
      left: '5%',
      right: '5%',
      height: 2,
      backgroundColor: palette.line,
      transform: 'translateY(-1px)',
    }}
  />
);

const Station: React.FC<{ station: (typeof STATIONS)[number]; t: number }> = ({ station, t }) => (
  <div
    style={{
      position: 'absolute',
      left: `${station.x * 100}%`,
      top: '50%',
      transform: `translate(-50%, -50%) scale(${0.7 + 0.3 * t})`,
      opacity: t,
    }}
  >
    <div
      style={{
        width: 16,
        height: 16,
        borderRadius: '50%',
        backgroundColor: palette.accent,
        boxShadow: `0 0 0 ${4 + t * 6}px ${palette.accentSoft}`,
      }}
    />
    <div
      style={{
        position: 'absolute',
        top: 28,
        left: '50%',
        transform: 'translateX(-50%)',
        textAlign: 'center',
        whiteSpace: 'nowrap',
      }}
    >
      <div
        style={{
          fontFamily: fonts.jp,
          fontSize: 24,
          color: palette.ink,
          fontWeight: 600,
          letterSpacing: '-0.005em',
          whiteSpace: 'nowrap',
        }}
      >
        {station.label}
      </div>
      <div
        style={{
          fontFamily: fonts.mono,
          fontSize: 10,
          color: palette.muted,
          letterSpacing: '0.28em',
          marginTop: 4,
          whiteSpace: 'nowrap',
        }}
      >
        {station.en}
      </div>
    </div>
  </div>
);

const CardOnBelt: React.FC<{
  email: (typeof SAMPLE_EMAILS)[number];
  x: number;
  opacity: number;
  stationsCleared: number;
}> = ({ email, x, opacity, stationsCleared }) => {
  const left = `${x * 100}%`;
  const isReply = stationsCleared > 0.78;
  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left,
        transform: 'translate(-50%, -110%)',
        opacity,
      }}
    >
      {isReply ? (
        <ReplyBadge subject={email.subject} />
      ) : (
        <div style={{ transform: 'scale(0.7)', transformOrigin: 'center bottom' }}>
          <EmailCard data={email} width={360} />
        </div>
      )}
    </div>
  );
};

const ReplyBadge: React.FC<{ subject: string }> = () => (
  <div
    style={{
      backgroundColor: palette.accentSoft,
      border: `1px solid ${palette.accent}`,
      borderRadius: radius.md,
      padding: '10px 16px',
      fontFamily: fonts.jp,
      color: palette.accentInk,
      fontSize: 14,
      fontWeight: 600,
      boxShadow: shadow.md,
      whiteSpace: 'nowrap',
    }}
  >
    ✓ 返信下書き
  </div>
);

const Header: React.FC = () => (
  <div
    style={{
      position: 'absolute',
      top: 80,
      left: 0,
      right: 0,
      textAlign: 'center',
    }}
  >
    <div
      style={{
        fontFamily: fonts.mono,
        color: palette.muted,
        fontSize: 13,
        letterSpacing: '0.4em',
        textTransform: 'uppercase',
        marginBottom: 12,
      }}
    >
      mail · pipeline · 03 stages
    </div>
    <div
      style={{
        fontFamily: fonts.jp,
        color: palette.ink,
        fontSize: 48,
        fontWeight: 700,
        letterSpacing: '-0.02em',
      }}
    >
      届いてから、返信まで。
    </div>
  </div>
);
