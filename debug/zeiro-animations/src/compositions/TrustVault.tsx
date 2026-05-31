import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { Background } from '../common/Background';
import { fonts } from '../fonts';
import { ease, palette, radius, shadow } from '../theme';

// A series of "document chips" with PII fly toward a central vault, which then
// closes shut, dial spins, then locks with a satisfying pop.
const DOC_CHIPS = [
  { label: 'マイナンバー', color: palette.urgent, x: -380, y: -180 },
  { label: '銀行口座', color: 'oklch(48% 0.06 195)', x: 360, y: -200 },
  { label: '住所', color: 'oklch(58% 0.1 70)', x: -420, y: 60 },
  { label: '電話番号', color: 'oklch(45% 0.08 295)', x: 380, y: 120 },
  { label: '顧客 ID', color: 'oklch(52% 0.1 25)', x: 40, y: -260 },
];

export const TrustVault: React.FC = () => {
  const frame = useCurrentFrame();

  const headerIn = interpolate(frame, [0, 24], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(...ease.brand),
  });

  const dialSpin = interpolate(frame, [80, 140], [0, 720], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(...ease.editorial),
  });

  const closeT = interpolate(frame, [140, 170], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(...ease.pop),
  });

  const stampIn = interpolate(frame, [180, 215], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(...ease.brand),
  });

  return (
    <AbsoluteFill>
      <Background variant="ink" />

      <Header opacity={headerIn} />

      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'relative', width: 700, height: 700 }}>
          {/* Vault body */}
          <div
            style={{
              position: 'absolute',
              inset: 130,
              borderRadius: 24,
              backgroundColor: palette.ink2,
              border: `2px solid ${palette.muted}`,
              boxShadow: 'inset 0 0 80px rgba(0,0,0,0.5)',
            }}
          />
          {/* Vault door (circle) */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: 360,
              height: 360,
              marginLeft: -180,
              marginTop: -180,
              borderRadius: '50%',
              backgroundColor: palette.surface,
              border: `8px solid ${palette.muted}`,
              boxShadow: shadow.lg,
              transform: `scale(${0.92 + 0.08 * closeT})`,
              transformOrigin: 'center',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 40,
                borderRadius: '50%',
                border: `2px dashed ${palette.muted2}`,
                transform: `rotate(${dialSpin}deg)`,
                transformOrigin: 'center',
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 80,
                borderRadius: '50%',
                border: `1px solid ${palette.line}`,
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: 60,
                height: 60,
                marginLeft: -30,
                marginTop: -30,
                borderRadius: '50%',
                backgroundColor: palette.accent,
                transform: `rotate(${dialSpin}deg)`,
                boxShadow: `0 0 0 ${closeT * 16}px rgba(11, 78, 50, 0.18)`,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: 4,
                  width: 4,
                  height: 26,
                  marginLeft: -2,
                  backgroundColor: palette.surface,
                  borderRadius: 4,
                }}
              />
            </div>
          </div>

          {/* PII chips */}
          {DOC_CHIPS.map((chip, i) => {
            const startFrame = 24 + i * 6;
            const chipT = interpolate(frame, [startFrame, startFrame + 50], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
              easing: Easing.bezier(...ease.brand),
            });
            const x = chip.x * (1 - chipT);
            const y = chip.y * (1 - chipT);
            const scale = 1 - chipT * 0.6;
            const opacity = chipT < 0.92 ? 1 : interpolate(chipT, [0.92, 1], [1, 0]);
            return (
              <div
                key={chip.label}
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(${scale})`,
                  opacity,
                  backgroundColor: palette.surface,
                  color: chip.color,
                  fontFamily: fonts.mono,
                  fontSize: 13,
                  padding: '10px 16px',
                  borderRadius: radius.sm,
                  border: `1px solid ${chip.color}`,
                  fontWeight: 600,
                }}
              >
                {chip.label}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>

      <div
        style={{
          position: 'absolute',
          bottom: 110,
          left: 0,
          right: 0,
          textAlign: 'center',
          opacity: stampIn,
          transform: `translateY(${(1 - stampIn) * 14}px)`,
        }}
      >
        <div
          style={{
            display: 'inline-block',
            fontFamily: fonts.mono,
            fontSize: 13,
            color: palette.bg,
            opacity: 0.7,
            letterSpacing: '0.32em',
            textTransform: 'uppercase',
            border: `1px solid ${palette.muted}`,
            padding: '10px 22px',
            borderRadius: 999,
          }}
        >
          encrypted · jp-tokyo · no-train contract
        </div>
      </div>
    </AbsoluteFill>
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
        color: palette.muted2,
        letterSpacing: '0.4em',
        textTransform: 'uppercase',
        marginBottom: 12,
      }}
    >
      data residency · jp-tokyo
    </div>
    <div
      style={{
        fontFamily: fonts.jp,
        fontSize: 46,
        color: palette.bg,
        fontWeight: 700,
        letterSpacing: '-0.02em',
      }}
    >
      お客様の情報は、金庫の中。
    </div>
  </div>
);
