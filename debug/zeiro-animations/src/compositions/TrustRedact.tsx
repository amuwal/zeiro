import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { Background } from '../common/Background';
import { fonts } from '../fonts';
import { ease, palette, radius, shadow } from '../theme';

// A long line of PII gets caught by a scan-line and replaced with redacted blocks
// in place. Visualises 守秘義務 §38 in motion.
const LINES: Array<{
  text: string;
  redactRanges: Array<[number, number]>;
}> = [
  { text: '田中 一郎 様 (My Number: 1234 5678 9012)', redactRanges: [[24, 39]] },
  { text: '口座 三井住友銀行 普通 1234567 (顧問契約: 田中商事)', redactRanges: [[15, 22]] },
  {
    text: '電話 090-1234-5678 / 住所 東京都港区六本木 5-1-2',
    redactRanges: [
      [3, 16],
      [22, 36],
    ],
  },
  { text: '依頼内容: 令和 5 年分の源泉徴収票の再発行', redactRanges: [] },
];

export const TrustRedact: React.FC = () => {
  const frame = useCurrentFrame();

  // Scan line traverses top-to-bottom over the document body region.
  const scanProgress = interpolate(frame, [30, 130], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(...ease.editorial),
  });

  const headerIn = interpolate(frame, [0, 24], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(...ease.brand),
  });

  const stampIn = interpolate(frame, [140, 170], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(...ease.pop),
  });

  const docTop = 280;
  const docHeight = 540;
  const scanY = docTop + scanProgress * docHeight;
  const lineH = 48;

  return (
    <AbsoluteFill>
      <Background />

      <div
        style={{
          position: 'absolute',
          left: 320,
          right: 320,
          top: docTop,
          height: docHeight,
          backgroundColor: palette.surface,
          border: `1px solid ${palette.line}`,
          borderRadius: radius.lg,
          boxShadow: shadow.lg,
          padding: '48px 56px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            fontFamily: fonts.mono,
            fontSize: 12,
            color: palette.muted,
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
            marginBottom: 24,
            opacity: headerIn,
          }}
        >
          tanaka_request_2026-05-29.eml
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {LINES.map((line, i) => {
            const lineTop = docTop + 100 + i * lineH;
            const redacted = scanY > lineTop;
            return (
              <LineRow
                key={i}
                text={line.text}
                redactRanges={line.redactRanges}
                redacted={redacted}
              />
            );
          })}
        </div>

        {/* scan line */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: scanY - docTop,
            height: 3,
            backgroundColor: palette.accent,
            boxShadow: `0 0 28px 6px ${palette.accent}`,
            opacity: scanProgress > 0 && scanProgress < 1 ? 1 : 0,
          }}
        />
      </div>

      <Header opacity={headerIn} />

      <Stamp opacity={stampIn} />
    </AbsoluteFill>
  );
};

const LineRow: React.FC<{
  text: string;
  redactRanges: Array<[number, number]>;
  redacted: boolean;
}> = ({ text, redactRanges, redacted }) => {
  const segments: Array<{ s: string; redact: boolean }> = [];
  let cursor = 0;
  for (const [start, end] of redactRanges) {
    if (cursor < start) segments.push({ s: text.slice(cursor, start), redact: false });
    segments.push({ s: text.slice(start, end), redact: true });
    cursor = end;
  }
  if (cursor < text.length) segments.push({ s: text.slice(cursor), redact: false });

  return (
    <div
      style={{
        fontFamily: fonts.jp,
        fontSize: 22,
        color: palette.ink,
        lineHeight: 1.5,
      }}
    >
      {segments.map((seg, i) =>
        seg.redact && redacted ? (
          <span
            key={i}
            style={{
              display: 'inline-block',
              backgroundColor: palette.ink,
              color: 'transparent',
              padding: '0 6px',
              borderRadius: 3,
              userSelect: 'none',
            }}
          >
            {seg.s}
          </span>
        ) : (
          <span key={i}>{seg.s}</span>
        ),
      )}
    </div>
  );
};

const Header: React.FC<{ opacity: number }> = ({ opacity }) => (
  <div
    style={{
      position: 'absolute',
      top: 96,
      left: 0,
      right: 0,
      textAlign: 'center',
      opacity,
    }}
  >
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
      pii sweep · 税理士法 §38
    </div>
    <div
      style={{
        fontFamily: fonts.jp,
        fontSize: 46,
        color: palette.ink,
        fontWeight: 700,
        letterSpacing: '-0.02em',
      }}
    >
      お預かりした情報は、AI に渡る前にマスクします。
    </div>
  </div>
);

const Stamp: React.FC<{ opacity: number }> = ({ opacity }) => (
  <div
    style={{
      position: 'absolute',
      bottom: 110,
      left: 0,
      right: 0,
      display: 'flex',
      justifyContent: 'center',
      opacity,
      transform: `scale(${0.85 + 0.15 * opacity})`,
    }}
  >
    <div
      style={{
        border: `2px solid ${palette.urgent}`,
        color: palette.urgent,
        padding: '10px 22px',
        borderRadius: 999,
        fontFamily: fonts.mono,
        fontSize: 14,
        letterSpacing: '0.3em',
        textTransform: 'uppercase',
        backgroundColor: 'rgba(252, 247, 240, 0.85)',
      }}
    >
      PII masked · 3 fields · 0 leaked
    </div>
  </div>
);
