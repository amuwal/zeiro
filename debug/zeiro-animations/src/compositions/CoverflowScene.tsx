import { AbsoluteFill } from 'remotion';
import { fonts } from '../fonts';
import { palette } from '../theme';
import { CARD_H } from './CoverflowCenter';

export const CENTER_X = 960;
export const ROW_Y = 415;

// Coverflow horizontal spread: first card off-center jumps a wide gap, outer
// cards compress (they overlap behind), keeping the deck inside safe margins.
const slotX = (slot: number) => {
  const s = Math.sign(slot);
  const a = Math.abs(slot);
  const near = Math.min(a, 1) * 245;
  const far = Math.max(a - 1, 0) * 95;
  return CENTER_X + s * (near + far);
};

export const placement = (slot: number) => {
  const abs = Math.abs(slot);
  const x = slotX(slot);
  const rotY = -Math.sign(slot) * Math.min(abs, 1) * 48;
  const z = -abs * 190;
  const scale = abs < 1 ? 1 - abs * 0.14 : Math.max(0.72, 0.86 - (abs - 1) * 0.07);
  return { x, rotY, z, scale };
};

export const Reflection: React.FC<{ children: React.ReactNode; h: number }> = ({ children, h }) => (
  <div
    style={{
      position: 'absolute',
      top: h + 6,
      left: 0,
      transform: 'scaleY(-1)',
      opacity: 0.24,
      WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent 55%)',
      maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent 55%)',
      pointerEvents: 'none',
    }}
  >
    {children}
  </div>
);

export const GlossyFloor: React.FC = () => (
  <div
    style={{
      position: 'absolute',
      left: 0,
      right: 0,
      top: ROW_Y + CARD_H - 24,
      height: 320,
      background: `linear-gradient(to bottom, ${palette.ink} 0%, #0c0a08 40%, ${palette.bg2} 100%)`,
      opacity: 0.16,
    }}
  />
);

export const Overlay: React.FC<{ headIn: number; pill: number }> = ({ headIn, pill }) => (
  <AbsoluteFill style={{ pointerEvents: 'none' }}>
    <div
      style={{
        position: 'absolute',
        top: 96,
        left: 0,
        right: 0,
        textAlign: 'center',
        opacity: headIn,
        transform: `translateY(${(1 - headIn) * -12}px)`,
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
        ONE PASS · 受信 → 下書き
      </div>
      <div
        style={{
          fontFamily: fonts.jp,
          fontSize: 50,
          fontWeight: 700,
          color: palette.ink,
          letterSpacing: '-0.02em',
        }}
      >
        受信メールが、そのまま返信の下書きに。
      </div>
    </div>

    <div
      style={{
        position: 'absolute',
        bottom: 96,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        opacity: pill,
        transform: `translateY(${(1 - pill) * 14}px) scale(${0.9 + 0.1 * pill})`,
      }}
    >
      <div
        style={{
          fontFamily: fonts.jp,
          fontSize: 18,
          fontWeight: 700,
          color: palette.bg,
          backgroundColor: palette.accent,
          padding: '14px 30px',
          borderRadius: 999,
          letterSpacing: '0.04em',
          boxShadow: '0 18px 40px -16px rgba(20,17,13,0.5)',
          whiteSpace: 'nowrap',
        }}
      >
        承認して送信
      </div>
    </div>

    <div
      style={{
        position: 'absolute',
        bottom: 44,
        left: 0,
        right: 0,
        textAlign: 'center',
        fontFamily: fonts.mono,
        fontSize: 13,
        color: palette.muted,
        letterSpacing: '0.3em',
        textTransform: 'uppercase',
        opacity: headIn,
      }}
    >
      引用付き · 人が承認して送信
    </div>
  </AbsoluteFill>
);
