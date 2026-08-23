'use client';

import { useMemo } from 'react';

const CC_VB_W = 700;
const CC_VB_H = 560;
const CC_HUB = { x: 350, y: 280, r: 64 };
const CC_CYCLE = 3.33;
const CC_STAGGER = 0.58;

type ChannelPos = 'tl' | 'tr' | 'ml' | 'bl' | 'br';

type Channel = {
  id: string;
  glyph: string;
  label: string;
  meta: string;
  ax: number;
  ay: number;
  pos: ChannelPos;
};

const CC_CHANNELS: Channel[] = [
  { id: 'email', glyph: '@', label: 'Email', meta: 'RESEND', ax: 132, ay: 102, pos: 'tl' },
  { id: 'line', glyph: 'L', label: 'LINE 公式', meta: '連携', ax: 568, ay: 128, pos: 'tr' },
  { id: 'web', glyph: 'F', label: 'Webフォーム', meta: '受付', ax: 138, ay: 458, pos: 'bl' },
  { id: 'chat', glyph: 'C', label: 'Chatwork', meta: 'API', ax: 562, ay: 444, pos: 'br' },
];

function ccBuildWire(c: Channel): string {
  const dx = CC_HUB.x - c.ax;
  const dy = CC_HUB.y - c.ay;
  const dist = Math.hypot(dx, dy) || 1;
  const ux = dx / dist;
  const uy = dy / dist;
  const sx = c.ax + ux * 4;
  const sy = c.ay + uy * 4;
  const ex = CC_HUB.x - ux * CC_HUB.r;
  const ey = CC_HUB.y - uy * CC_HUB.r;
  const mx = (sx + ex) / 2;
  const my = (sy + ey) / 2;
  const perpX = -uy;
  const perpY = ux;
  const curve = c.pos === 'ml' ? 0 : 22;
  const cx = mx + perpX * curve;
  const cy = my + perpY * curve;
  return `M ${sx.toFixed(2)} ${sy.toFixed(2)} Q ${cx.toFixed(2)} ${cy.toFixed(2)} ${ex.toFixed(2)} ${ey.toFixed(2)}`;
}

type NodeStyle = React.CSSProperties & { animationDelay?: string };

export function ChannelConstellation() {
  const wires = useMemo(
    () =>
      CC_CHANNELS.map((c, i) => ({
        ...c,
        d: ccBuildWire(c),
        delay: i * CC_STAGGER,
      })),
    [],
  );

  const hubLeftPct = (CC_HUB.x / CC_VB_W) * 100;
  const hubTopPct = (CC_HUB.y / CC_VB_H) * 100;
  const hubWidthPct = ((CC_HUB.r * 2) / CC_VB_W) * 100;

  const ripples = [
    { id: 'first', delay: 0 },
    { id: 'second', delay: CC_STAGGER },
    { id: 'third', delay: CC_STAGGER * 2 },
  ];

  return (
    <div className="constellation">
      <div className="cc-grid" aria-hidden="true" />
      <div className="cc-aura" aria-hidden="true" />

      <svg
        className="cc-svg"
        viewBox={`0 0 ${CC_VB_W} ${CC_VB_H}`}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="cc-hub-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(10,10,10,0.16)" />
            <stop offset="55%" stopColor="rgba(10,10,10,0.04)" />
            <stop offset="100%" stopColor="rgba(10,10,10,0)" />
          </radialGradient>
          <linearGradient id="cc-wire-grad" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="rgba(10,10,10,0)" />
            <stop offset="0.25" stopColor="rgba(10,10,10,0.28)" />
            <stop offset="1" stopColor="rgba(10,10,10,0.28)" />
          </linearGradient>
          <radialGradient id="cc-packet" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#0A0A0A" />
            <stop offset="55%" stopColor="#0A0A0A" />
            <stop offset="100%" stopColor="rgba(10,10,10,0)" />
          </radialGradient>
        </defs>

        <circle cx={CC_HUB.x} cy={CC_HUB.y} r={210} fill="url(#cc-hub-glow)" />
        <circle cx={CC_HUB.x} cy={CC_HUB.y} r={CC_HUB.r + 28} className="cc-guide" />
        <circle cx={CC_HUB.x} cy={CC_HUB.y} r={CC_HUB.r + 64} className="cc-guide cc-guide-2" />

        {ripples.map(({ id, delay }) => (
          <circle key={id} cx={CC_HUB.x} cy={CC_HUB.y} className="cc-ripple">
            <animate
              attributeName="r"
              from={CC_HUB.r}
              to={CC_HUB.r + 46}
              dur={`${CC_STAGGER * 3}s`}
              begin={`${delay}s`}
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="0.35;0"
              keyTimes="0;1"
              dur={`${CC_STAGGER * 3}s`}
              begin={`${delay}s`}
              repeatCount="indefinite"
            />
          </circle>
        ))}

        {wires.map((w) => (
          <path key={`w-${w.id}`} id={`cc-wire-${w.id}`} d={w.d} className="cc-wire" />
        ))}

        {wires.map((w) => (
          <g key={`p-${w.id}`}>
            <circle r="5" className="cc-packet" fill="url(#cc-packet)">
              <animateMotion
                dur={`${CC_CYCLE}s`}
                begin={`${w.delay}s`}
                repeatCount="indefinite"
                rotate="auto"
              >
                <mpath href={`#cc-wire-${w.id}`} />
              </animateMotion>
              <animate
                attributeName="opacity"
                values="0;1;1;0"
                keyTimes="0;0.12;0.88;1"
                dur={`${CC_CYCLE}s`}
                begin={`${w.delay}s`}
                repeatCount="indefinite"
              />
            </circle>
          </g>
        ))}
      </svg>

      <div
        className="cc-hub"
        style={{ left: `${hubLeftPct}%`, top: `${hubTopPct}%`, width: `${hubWidthPct}%` }}
      >
        <span className="cc-hub-name">Zeiro</span>
        <span className="cc-hub-tag">REVIEW INBOX</span>
      </div>

      {wires.map((c) => {
        const style: NodeStyle = {
          left: `${(c.ax / CC_VB_W) * 100}%`,
          top: `${(c.ay / CC_VB_H) * 100}%`,
          animationDelay: `${c.delay}s`,
        };
        return (
          <div key={c.id} className={`cc-node cc-node-${c.pos}`} style={style}>
            <span className="cc-glyph">{c.glyph}</span>
            <span className="cc-label">{c.label}</span>
            <span className="cc-meta">{c.meta}</span>
          </div>
        );
      })}
    </div>
  );
}
