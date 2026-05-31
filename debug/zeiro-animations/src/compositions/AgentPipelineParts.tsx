import { AbsoluteFill } from 'remotion';
import { fonts } from '../fonts';
import { palette } from '../theme';
import type { PipelineNode } from './AgentPipelineNode';

type Placed = PipelineNode & { x: number; y: number; z: number };

export const Edge: React.FC<{
  a: Placed;
  b: Placed;
  fill: number;
  travel: number;
}> = ({ a, b, fill, travel }) => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  const ang = (Math.atan2(dy, dx) * 180) / Math.PI;
  const midZ = (a.z + b.z) / 2;

  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: a.x,
          top: a.y,
          width: len,
          height: 3,
          transformOrigin: '0 50%',
          transform: `translateZ(${midZ}px) rotate(${ang}deg)`,
          background: `linear-gradient(90deg, ${palette.lineStrong}, ${palette.line})`,
          opacity: 0.5,
          borderRadius: 2,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: a.x,
          top: a.y,
          width: len * Math.min(travel, 1),
          height: 3,
          transformOrigin: '0 50%',
          transform: `translateZ(${midZ}px) rotate(${ang}deg)`,
          background: palette.accent,
          opacity: 0.35 + 0.4 * fill,
          borderRadius: 2,
        }}
      />
      {travel > 0 && travel < 1 && (
        <div
          style={{
            position: 'absolute',
            left: a.x,
            top: a.y,
            transform: `translateZ(${midZ}px) rotate(${ang}deg) translateX(${
              len * travel
            }px) translate(-50%, -50%)`,
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: palette.accent,
            boxShadow: `0 0 18px 6px ${palette.accentSoft}`,
          }}
        />
      )}
    </>
  );
};

export const Overlays: React.FC<{ opacity: number }> = ({ opacity }) => (
  <AbsoluteFill style={{ pointerEvents: 'none' }}>
    <div
      style={{
        position: 'absolute',
        top: 96,
        left: 120,
        opacity,
        transform: `translateY(${(1 - opacity) * 14}px)`,
      }}
    >
      <div
        style={{
          fontFamily: fonts.mono,
          fontSize: 13,
          color: palette.muted2,
          letterSpacing: '0.4em',
          textTransform: 'uppercase',
          fontWeight: 500,
        }}
      >
        Agent Pipeline · 5 Steps
      </div>
      <div
        style={{
          marginTop: 18,
          fontFamily: fonts.jp,
          fontSize: 50,
          fontWeight: 700,
          color: palette.ink,
          letterSpacing: '-0.02em',
          lineHeight: 1.15,
        }}
      >
        受信から下書きまで、5 つの工程。
      </div>
    </div>

    <div
      style={{
        position: 'absolute',
        bottom: 80,
        left: 120,
        display: 'flex',
        gap: 12,
        opacity,
      }}
    >
      {['Mastra', 'Claude', 'Gemini Flash', 'pgvector'].map((chip) => (
        <div
          key={chip}
          style={{
            fontFamily: fonts.mono,
            fontSize: 13,
            fontWeight: 500,
            color: palette.ink2,
            letterSpacing: '0.16em',
            padding: '9px 16px',
            borderRadius: 999,
            border: `1px solid ${palette.line}`,
            backgroundColor: palette.surface,
          }}
        >
          {chip}
        </div>
      ))}
    </div>
  </AbsoluteFill>
);
