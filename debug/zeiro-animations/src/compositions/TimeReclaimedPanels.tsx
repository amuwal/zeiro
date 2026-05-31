import { Easing, interpolate, useCurrentFrame } from 'remotion';
import { fonts } from '../fonts';
import { ease, palette, radius, shadow } from '../theme';

const eb = (
  f: number,
  a: number,
  b: number,
  from: number,
  to: number,
  e: readonly [number, number, number, number] = ease.brand,
) =>
  interpolate(f, [a, b], [from, to], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(...e),
  });

export const Panel: React.FC<{
  z: number;
  delay: number;
  pad?: number;
  children: React.ReactNode;
}> = ({ z, delay, pad = 36, children }) => {
  const frame = useCurrentFrame();
  const t = eb(frame, delay, delay + 36, 0, 1);
  return (
    <div
      style={{
        position: 'relative',
        transform: `translateZ(${z}px) translateY(${(1 - t) * 46}px)`,
        opacity: t,
        backgroundColor: palette.surface,
        border: `1px solid ${palette.line}`,
        borderRadius: radius.lg,
        boxShadow: shadow.lg,
        padding: pad,
        height: '100%',
        boxSizing: 'border-box',
      }}
    >
      {children}
    </div>
  );
};

export const PanelTitle: React.FC<{ jp: string; en: string }> = ({ jp, en }) => (
  <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 4 }}>
    <span
      style={{
        fontFamily: fonts.jp,
        fontSize: 19,
        fontWeight: 700,
        color: palette.ink,
        letterSpacing: '-0.01em',
        whiteSpace: 'nowrap',
      }}
    >
      {jp}
    </span>
    <span
      style={{
        fontFamily: fonts.mono,
        fontSize: 10,
        color: palette.muted2,
        letterSpacing: '0.3em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
      }}
    >
      {en}
    </span>
  </div>
);

type Arc = { label: string; value: number; color: string };
const ARCS: Arc[] = [
  { label: '税務', value: 512, color: palette.catTax },
  { label: '書類', value: 388, color: palette.catDocs },
  { label: '期限', value: 221, color: palette.catDeadline },
  { label: '契約', value: 126, color: palette.catContract },
];
const TOTAL = 1247;

export const HeroDonut: React.FC = () => {
  const frame = useCurrentFrame();
  const R = 132;
  const C = 2 * Math.PI * R;
  const cx = 176;
  const cy = 168;
  const count = Math.round(eb(frame, 80, 180, 0, TOTAL, ease.editorial));
  let acc = 0;
  return (
    <>
      <PanelTitle jp="返信 件数" en="REPLIES / MO" />
      <div style={{ display: 'flex', gap: 28, alignItems: 'center', marginTop: 18 }}>
        <svg width={352} height={336} style={{ flexShrink: 0 }} aria-hidden="true">
          <circle cx={cx} cy={cy} r={R} fill="none" stroke={palette.line} strokeWidth={28} />
          {ARCS.map((a, i) => {
            const frac = a.value / TOTAL;
            const len = C * frac;
            const rot = (acc / TOTAL) * 360 - 90;
            acc += a.value;
            const draw = eb(frame, 60 + i * 16, 130 + i * 16, 0, 1, ease.brand);
            return (
              <circle
                key={a.label}
                cx={cx}
                cy={cy}
                r={R}
                fill="none"
                stroke={a.color}
                strokeWidth={28}
                strokeLinecap="butt"
                strokeDasharray={`${len * draw} ${C}`}
                transform={`rotate(${rot} ${cx} ${cy})`}
              />
            );
          })}
          <text
            x={cx}
            y={cy - 6}
            textAnchor="middle"
            fontFamily={fonts.sans}
            fontSize={56}
            fontWeight={700}
            fill={palette.ink}
            style={{ letterSpacing: '-0.02em' }}
          >
            {count.toLocaleString('en-US')}
          </text>
          <text
            x={cx}
            y={cy + 30}
            textAnchor="middle"
            fontFamily={fonts.jp}
            fontSize={18}
            fontWeight={500}
            fill={palette.muted}
          >
            件 / 月
          </text>
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {ARCS.map((a, i) => {
            const t = eb(frame, 90 + i * 10, 120 + i * 10, 0, 1, ease.pop);
            return (
              <div
                key={a.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 11,
                  opacity: t,
                  transform: `translateX(${(1 - t) * 10}px)`,
                }}
              >
                <span
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 3,
                    backgroundColor: a.color,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontFamily: fonts.jp,
                    fontSize: 16,
                    fontWeight: 600,
                    color: palette.ink2,
                    width: 38,
                  }}
                >
                  {a.label}
                </span>
                <span
                  style={{
                    fontFamily: fonts.sans,
                    fontSize: 16,
                    fontWeight: 600,
                    color: palette.ink,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {a.value}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

export const BeforeAfter: React.FC = () => {
  const frame = useCurrentFrame();
  const afterW = eb(frame, 110, 165, 0, 1, ease.brand);
  const delta = Math.round(eb(frame, 120, 185, 0, 97, ease.editorial));
  return (
    <>
      <PanelTitle jp="1 通あたり" en="PER MESSAGE" />
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          marginTop: 22,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
          <Bar
            label="従来"
            value="14.2"
            unit="分"
            frac={1}
            color={palette.lineStrong}
            ink={palette.muted}
            delay={88}
          />
          <Bar
            label="Zeiro"
            value="24"
            unit="秒"
            frac={Math.max(0.07, afterW * 0.13)}
            color={palette.accent}
            ink={palette.accentInk}
            delay={110}
          />
        </div>
        <div style={{ textAlign: 'right', paddingLeft: 24 }}>
          <div
            style={{
              fontFamily: fonts.sans,
              fontSize: 56,
              fontWeight: 700,
              color: palette.accent,
              letterSpacing: '-0.03em',
              lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            −{delta}%
          </div>
          <div style={{ fontFamily: fonts.jp, fontSize: 13, color: palette.muted, marginTop: 6 }}>
            所要時間
          </div>
        </div>
      </div>
    </>
  );
};

const Bar: React.FC<{
  label: string;
  value: string;
  unit: string;
  frac: number;
  color: string;
  ink: string;
  delay: number;
}> = ({ label, value, unit, frac, color, ink, delay }) => {
  const frame = useCurrentFrame();
  const t = eb(frame, delay, delay + 28, 0, 1);
  return (
    <div style={{ opacity: t }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 7,
        }}
      >
        <span
          style={{
            fontFamily: fonts.mono,
            fontSize: 11,
            color: palette.muted2,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
          }}
        >
          {label}
        </span>
        <span>
          <span
            style={{
              fontFamily: fonts.sans,
              fontSize: 22,
              fontWeight: 700,
              color: ink,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {value}
          </span>
          <span style={{ fontFamily: fonts.jp, fontSize: 13, color: palette.muted, marginLeft: 3 }}>
            {unit}
          </span>
        </span>
      </div>
      <div
        style={{ height: 14, backgroundColor: palette.bg2, borderRadius: 7, overflow: 'hidden' }}
      >
        <div
          style={{
            height: '100%',
            width: `${frac * 100}%`,
            backgroundColor: color,
            borderRadius: 7,
          }}
        />
      </div>
    </div>
  );
};
