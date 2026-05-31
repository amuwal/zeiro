import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { Background } from '../common/Background';
import { fonts } from '../fonts';
import { ease, palette } from '../theme';

// A "constellation of cities" rendered as a vertical archipelago — north (Sapporo) at the
// top, south (Naha) at the bottom. The shape evokes Japan without a literal silhouette,
// which never reads convincingly at this canvas size.

type City = {
  name: string;
  romaji: string;
  x: number; // 0..1 across the centred 800px column
  y: number; // 0..1 along the column
  size: number;
  primary?: boolean;
};

const CITIES: City[] = [
  { name: '札幌', romaji: 'Sapporo', x: 0.78, y: 0.08, size: 14 },
  { name: '仙台', romaji: 'Sendai', x: 0.7, y: 0.25, size: 12 },
  { name: '東京', romaji: 'Tokyo', x: 0.62, y: 0.42, size: 22, primary: true },
  { name: '名古屋', romaji: 'Nagoya', x: 0.48, y: 0.5, size: 14 },
  { name: '京都', romaji: 'Kyoto', x: 0.4, y: 0.55, size: 12 },
  { name: '大阪', romaji: 'Osaka', x: 0.36, y: 0.58, size: 14 },
  { name: '広島', romaji: 'Hiroshima', x: 0.25, y: 0.66, size: 12 },
  { name: '福岡', romaji: 'Fukuoka', x: 0.15, y: 0.76, size: 14 },
  { name: '鹿児島', romaji: 'Kagoshima', x: 0.18, y: 0.84, size: 10 },
  { name: '那覇', romaji: 'Naha', x: 0.04, y: 0.94, size: 10 },
];

export const JapanMap: React.FC = () => {
  const frame = useCurrentFrame();

  const headerIn = interpolate(frame, [0, 24], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(...ease.brand),
  });

  // Bounding box for the "column" of cities — placed right-of-centre.
  const colLeft = 1100;
  const colTop = 80;
  const colW = 720;
  const colH = 920;

  const project = (c: City) => ({
    x: colLeft + c.x * colW,
    y: colTop + c.y * colH,
  });

  const arrivalFor = (i: number) => 40 + i * 12;

  return (
    <AbsoluteFill>
      <Background variant="ink" />

      <Header opacity={headerIn} />

      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        {/* Polyline connecting the archipelago in order */}
        {CITIES.slice(0, -1).map((c, i) => {
          const next = CITIES[i + 1];
          const a = project(c);
          const b = project(next);
          const showAt = arrivalFor(i);
          const t = interpolate(frame, [showAt, showAt + 16], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: Easing.bezier(...ease.brand),
          });
          return (
            <line
              key={i}
              x1={a.x}
              y1={a.y}
              x2={a.x + (b.x - a.x) * t}
              y2={a.y + (b.y - a.y) * t}
              stroke={palette.accent}
              strokeWidth={1.5}
              opacity={0.6}
            />
          );
        })}

        {/* Pulse rings around primary city */}
        {CITIES.filter((c) => c.primary).map((c) => {
          const p = project(c);
          const pulsePhase = ((frame - 60) % 70) / 70;
          const r = c.size + pulsePhase * 38;
          const op = (1 - pulsePhase) * 0.6;
          return (
            <circle
              key={`pulse-${c.name}`}
              cx={p.x}
              cy={p.y}
              r={r}
              fill="none"
              stroke={palette.accent}
              strokeWidth={2}
              opacity={op}
            />
          );
        })}

        {/* City dots */}
        {CITIES.map((c, i) => {
          const p = project(c);
          const showAt = arrivalFor(i);
          const t = interpolate(frame, [showAt, showAt + 18], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: Easing.bezier(...ease.pop),
          });
          return (
            <g key={c.name}>
              <circle
                cx={p.x}
                cy={p.y}
                r={c.size * t}
                fill={c.primary ? palette.accent : palette.bg}
                opacity={c.primary ? 1 : 0.9}
              />
              {c.primary && <circle cx={p.x} cy={p.y} r={c.size * 0.4 * t} fill={palette.bg} />}
            </g>
          );
        })}
      </svg>

      {/* City labels — positioned to the left of each dot so they don't overflow the canvas */}
      {CITIES.map((c, i) => {
        const p = project(c);
        const showAt = arrivalFor(i) + 6;
        const t = interpolate(frame, [showAt, showAt + 18], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: Easing.bezier(...ease.brand),
        });
        return (
          <div
            key={c.name}
            style={{
              position: 'absolute',
              left: p.x - (c.primary ? 200 : 160),
              top: p.y - (c.primary ? 22 : 18),
              width: c.primary ? 180 : 140,
              textAlign: 'right',
              opacity: t,
              transform: `translateX(${(1 - t) * -8}px)`,
              fontFamily: fonts.jp,
              fontSize: c.primary ? 26 : 18,
              fontWeight: c.primary ? 700 : 500,
              color: c.primary ? palette.accent : palette.bg,
              letterSpacing: '-0.005em',
              whiteSpace: 'nowrap',
            }}
          >
            {c.name}
            <div
              style={{
                fontFamily: fonts.mono,
                fontSize: c.primary ? 12 : 10,
                color: palette.muted2,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                fontWeight: 400,
                marginTop: 2,
              }}
            >
              {c.romaji}
            </div>
          </div>
        );
      })}

      <Footer />
    </AbsoluteFill>
  );
};

const Header: React.FC<{ opacity: number }> = ({ opacity }) => (
  <div
    style={{
      position: 'absolute',
      top: 120,
      left: 120,
      opacity,
      maxWidth: 880,
    }}
  >
    <div
      style={{
        fontFamily: fonts.mono,
        fontSize: 13,
        color: palette.muted2,
        letterSpacing: '0.4em',
        textTransform: 'uppercase',
        marginBottom: 14,
      }}
    >
      footprint · 47 都道府県 · 北 → 南
    </div>
    <div
      style={{
        fontFamily: fonts.jp,
        fontSize: 60,
        color: palette.bg,
        fontWeight: 700,
        letterSpacing: '-0.02em',
        lineHeight: 1.1,
      }}
    >
      この国の
      <br />
      <span style={{ color: palette.accent }}>すべての事務所</span>のために。
    </div>

    <div
      style={{
        marginTop: 56,
        fontFamily: fonts.jp,
        fontSize: 22,
        color: palette.muted2,
        lineHeight: 1.7,
        maxWidth: 720,
      }}
    >
      税理士法人から個人事務所まで、
      <br />
      日本の税務文化に合わせて、ことばも書類も。
    </div>
  </div>
);

const Footer: React.FC = () => (
  <div
    style={{
      position: 'absolute',
      bottom: 80,
      left: 120,
      display: 'flex',
      gap: 40,
      fontFamily: fonts.mono,
      fontSize: 12,
      color: palette.muted2,
      letterSpacing: '0.32em',
      textTransform: 'uppercase',
    }}
  >
    <div>data residency · jp-tokyo</div>
    <div>jp-first language</div>
    <div>made in 東京</div>
  </div>
);
