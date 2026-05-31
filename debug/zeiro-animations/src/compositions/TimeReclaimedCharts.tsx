import { Easing, interpolate, useCurrentFrame } from 'remotion';
import { fonts } from '../fonts';
import { ease, palette, radius } from '../theme';
import { PanelTitle } from './TimeReclaimedPanels';

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

const WEEKLY = [148, 121, 96, 82, 61, 44, 27, 9];

export const AreaSpark: React.FC = () => {
  const frame = useCurrentFrame();
  const W = 560;
  const H = 156;
  const padL = 8;
  const padR = 8;
  const top = 14;
  const max = 160;
  const innerW = W - padL - padR;
  const pts = WEEKLY.map((v, i) => ({
    x: padL + (i / (WEEKLY.length - 1)) * innerW,
    y: top + (1 - v / max) * (H - top - 18),
  }));
  const draw = eb(frame, 100, 190, 0, 1, ease.editorial);
  const linePath = pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
  const areaPath = `${linePath} L${pts[pts.length - 1].x} ${H - 18} L${pts[0].x} ${H - 18} Z`;
  const lineLen = 1400;
  const headIdx = Math.min(pts.length - 1, Math.floor(draw * (pts.length - 1)));
  const head = pts[headIdx];
  return (
    <>
      <PanelTitle jp="週次 未読推移" en="UNREAD / WK" />
      <svg width={W} height={H} style={{ marginTop: 14, display: 'block' }} aria-hidden="true">
        <defs>
          <linearGradient id="tr-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={palette.accent} stopOpacity={0.18} />
            <stop offset="100%" stopColor={palette.accent} stopOpacity={0} />
          </linearGradient>
          <clipPath id="tr-clip">
            <rect x={padL} y={0} width={innerW * draw} height={H} />
          </clipPath>
        </defs>
        {[0.5, 1].map((g) => (
          <line
            key={g}
            x1={padL}
            y1={top + g * (H - top - 18)}
            x2={W - padR}
            y2={top + g * (H - top - 18)}
            stroke={palette.line}
            strokeWidth={1}
            strokeDasharray="3 6"
          />
        ))}
        <g clipPath="url(#tr-clip)">
          <path d={areaPath} fill="url(#tr-area)" />
          <path
            d={linePath}
            fill="none"
            stroke={palette.accent}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={lineLen}
            strokeDashoffset={lineLen * (1 - draw)}
          />
        </g>
        {draw > 0.02 && (
          <circle
            cx={head.x}
            cy={head.y}
            r={4.5}
            fill={palette.accent}
            stroke={palette.surface}
            strokeWidth={2}
          />
        )}
      </svg>
    </>
  );
};

type Tile = { jp: string; en: string; target: number; suffix: string; pre?: string };
const TILES: Tile[] = [
  { jp: '自動下書き率', en: 'AUTO-DRAFTED', target: 92, suffix: '%' },
  { jp: '削減時間', en: 'HOURS SAVED', target: 738, suffix: 'h / 年' },
  { jp: '引用付き', en: 'WITH CITATIONS', target: 100, suffix: '%' },
];

export const StatTiles: React.FC = () => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 26, height: '100%' }}>
    {TILES.map((t, i) => (
      <StatTile key={t.jp} tile={t} index={i} />
    ))}
  </div>
);

const StatTile: React.FC<{ tile: Tile; index: number }> = ({ tile, index }) => {
  const frame = useCurrentFrame();
  const t = eb(frame, 24 + index * 18, 60 + index * 18, 0, 1);
  const n = Math.round(eb(frame, 90 + index * 8, 180, 0, tile.target, ease.editorial));
  return (
    <div
      style={{
        backgroundColor: palette.surface2,
        border: `1px solid ${palette.line}`,
        borderRadius: radius.md,
        padding: '26px 30px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        opacity: t,
        transform: `translateY(${(1 - t) * 22}px)`,
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          fontFamily: fonts.mono,
          fontSize: 10,
          color: palette.muted2,
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
          marginBottom: 12,
        }}
      >
        {tile.en}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span
          style={{
            fontFamily: fonts.sans,
            fontSize: 46,
            fontWeight: 700,
            color: palette.ink,
            letterSpacing: '-0.03em',
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {tile.pre}
          {n}
        </span>
        <span
          style={{ fontFamily: fonts.jp, fontSize: 17, fontWeight: 500, color: palette.accent }}
        >
          {tile.suffix}
        </span>
      </div>
      <div style={{ fontFamily: fonts.jp, fontSize: 15, color: palette.muted, marginTop: 10 }}>
        {tile.jp}
      </div>
    </div>
  );
};
