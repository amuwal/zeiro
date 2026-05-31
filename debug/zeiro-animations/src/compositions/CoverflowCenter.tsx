import { Easing, interpolate, useCurrentFrame } from 'remotion';
import { CITED_SOURCES, ZEIRO_REPLY_LINES } from '../common/sampleEmails';
import { fonts } from '../fonts';
import { ease, palette, radius, shadow } from '../theme';

const CARD_W = 460;
const CARD_H = 510;

const FRONT_EMAIL = {
  from: '高橋会計 高橋様',
  subject: '年末調整 配偶者控除の判定',
  preview: '扶養範囲についてご教示ください。',
};

const Tag: React.FC<{ text: string; color: string; bg: string }> = ({ text, color, bg }) => (
  <span
    style={{
      fontFamily: fonts.jp,
      fontSize: 13,
      fontWeight: 700,
      color,
      backgroundColor: bg,
      padding: '5px 12px',
      borderRadius: radius.sm,
      letterSpacing: '0.08em',
      whiteSpace: 'nowrap',
    }}
  >
    {text}
  </span>
);

const Face: React.FC<{ back?: boolean; children: React.ReactNode; border: string }> = ({
  back,
  children,
  border,
}) => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      width: CARD_W,
      height: CARD_H,
      backfaceVisibility: 'hidden',
      WebkitBackfaceVisibility: 'hidden',
      transform: back ? 'rotateY(180deg)' : undefined,
      backgroundColor: palette.surface,
      border: `1px solid ${border}`,
      borderRadius: radius.lg,
      boxShadow: shadow.lg,
      padding: 30,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}
  >
    {children}
  </div>
);

const Front: React.FC = () => (
  <Face border={palette.lineStrong}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ width: 9, height: 9, borderRadius: 9, backgroundColor: palette.catTax }} />
      <span style={{ fontFamily: fonts.sans, fontSize: 15, color: palette.muted, fontWeight: 500 }}>
        {FRONT_EMAIL.from}
      </span>
      <span style={{ marginLeft: 'auto' }}>
        <Tag text="受信" color={palette.ink2} bg={palette.bg2} />
      </span>
    </div>
    <div
      style={{
        fontFamily: fonts.jp,
        fontSize: 26,
        fontWeight: 700,
        color: palette.ink,
        letterSpacing: '-0.01em',
        marginTop: 26,
        lineHeight: 1.4,
      }}
    >
      {FRONT_EMAIL.subject}
    </div>
    <div
      style={{
        height: 1,
        backgroundColor: palette.line,
        margin: '24px 0',
      }}
    />
    <div style={{ fontFamily: fonts.jp, fontSize: 17, color: palette.ink2, lineHeight: 1.9 }}>
      お世話になっております。
      <br />
      {FRONT_EMAIL.preview}
      <br />
      年内のご回答をお待ちしております。
    </div>
    <div
      style={{
        marginTop: 'auto',
        fontFamily: fonts.mono,
        fontSize: 12,
        color: palette.muted2,
        letterSpacing: '0.3em',
        textTransform: 'uppercase',
      }}
    >
      inbox · unread
    </div>
  </Face>
);

const Back: React.FC<{ frame: number }> = ({ frame }) => (
  <Face back border={palette.accentSoft}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span
        style={{
          fontFamily: fonts.mono,
          fontSize: 13,
          color: palette.accent,
          fontWeight: 700,
          letterSpacing: '0.18em',
        }}
      >
        ZEIRO
      </span>
      <span style={{ marginLeft: 'auto' }}>
        <Tag text="下書き" color={palette.accentInk} bg={palette.accentSoft} />
      </span>
    </div>
    <div style={{ marginTop: 22, flex: 1 }}>
      {ZEIRO_REPLY_LINES.map((line, i) => {
        const start = 150 + i * 7;
        const t = interpolate(frame, [start, start + 14], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: Easing.bezier(...ease.brand),
        });
        return (
          <div
            key={i}
            style={{
              fontFamily: fonts.jp,
              fontSize: line === '' ? 8 : 15,
              color: palette.ink2,
              lineHeight: 1.55,
              opacity: t,
              transform: `translateX(${(1 - t) * 8}px)`,
              minHeight: line === '' ? 8 : 23,
            }}
          >
            {line}
          </div>
        );
      })}
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 8 }}>
      {CITED_SOURCES.map((s, i) => {
        const start = 196 + i * 9;
        const t = interpolate(frame, [start, start + 16], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: Easing.bezier(...ease.pop),
        });
        return (
          <div
            key={s.id}
            style={{
              opacity: t,
              transform: `translateY(${(1 - t) * 8}px) scale(${0.92 + 0.08 * t})`,
              transformOrigin: 'left center',
              backgroundColor: palette.surface2,
              borderLeft: `3px solid ${s.color}`,
              borderRadius: radius.sm,
              padding: '7px 11px',
              display: 'flex',
              gap: 9,
              alignItems: 'center',
            }}
          >
            <span style={{ fontFamily: fonts.mono, fontSize: 12, fontWeight: 700, color: s.color }}>
              {s.id}
            </span>
            <span style={{ fontFamily: fonts.jp, fontSize: 12, color: palette.ink2 }}>
              {s.label}
            </span>
          </div>
        );
      })}
    </div>
  </Face>
);

export const CoverflowCenter: React.FC<{ flip: number }> = ({ flip }) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        position: 'relative',
        width: CARD_W,
        height: CARD_H,
        transformStyle: 'preserve-3d',
        transform: `rotateY(${flip}deg)`,
      }}
    >
      <Front />
      <Back frame={frame} />
    </div>
  );
};

export { CARD_H, CARD_W };
