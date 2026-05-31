import { ThreeCanvas } from '@remotion/three';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { Background } from '../common/Background';
import { fonts } from '../fonts';
import { ease, palette } from '../theme';
import { IsoWorkflowScene } from './IsoWorkflowScene';

const STAGES: { jp: string; en: string; left: string }[] = [
  { jp: '受信トレイ', en: 'INBOX', left: '15%' },
  { jp: 'ZEIRO エンジン', en: 'CLASSIFY · RETRIEVE', left: '50%' },
  { jp: '下書き完成', en: 'DRAFT', left: '84%' },
];

const fadeIn = (frame: number, a: number, b: number, e = ease.brand) =>
  interpolate(frame, [a, b], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(...e),
  });

export const IsoWorkflow: React.FC = () => {
  const { width, height } = useVideoConfig();
  const frame = useCurrentFrame();

  const headIn = fadeIn(frame, 0, 28);
  const captionIn = fadeIn(frame, 12, 40);
  const footIn = fadeIn(frame, 18, 46);

  return (
    <AbsoluteFill>
      <Background variant="cream" />
      <ThreeCanvas
        width={width}
        height={height}
        shadows
        camera={{ position: [10, 9, 12], fov: 28 }}
        gl={{ alpha: true, antialias: true }}
        style={{ position: 'absolute', inset: 0 }}
      >
        <IsoWorkflowScene frame={frame} />
      </ThreeCanvas>

      <AbsoluteFill style={{ pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: 96, left: 120, right: 120 }}>
          <div
            style={{
              fontFamily: fonts.mono,
              fontSize: 14,
              color: palette.muted2,
              letterSpacing: '0.4em',
              textTransform: 'uppercase',
              opacity: headIn,
              transform: `translateY(${(1 - headIn) * -8}px)`,
            }}
          >
            ZEIRO · WORKFLOW ENGINE
          </div>
          <div
            style={{
              fontFamily: fonts.jp,
              fontSize: 52,
              fontWeight: 700,
              color: palette.ink,
              letterSpacing: '-0.02em',
              marginTop: 14,
              opacity: headIn,
              transform: `translateY(${(1 - headIn) * 12}px)`,
              whiteSpace: 'nowrap',
            }}
          >
            散らかった受信を、整った下書きへ。
          </div>
        </div>

        {STAGES.map((s, i) => {
          const t = fadeIn(frame, 12 + i * 6, 40 + i * 6);
          return (
            <div
              key={s.en}
              style={{
                position: 'absolute',
                bottom: 168,
                left: s.left,
                transform: `translateX(-50%) translateY(${(1 - t) * 10}px)`,
                textAlign: 'center',
                opacity: captionIn * t,
              }}
            >
              <div
                style={{
                  fontFamily: fonts.jp,
                  fontSize: 18,
                  fontWeight: 700,
                  color: palette.ink2,
                  letterSpacing: '0.04em',
                  whiteSpace: 'nowrap',
                }}
              >
                {s.jp}
              </div>
              <div
                style={{
                  fontFamily: fonts.mono,
                  fontSize: 11,
                  color: palette.muted,
                  letterSpacing: '0.34em',
                  textTransform: 'uppercase',
                  marginTop: 6,
                  whiteSpace: 'nowrap',
                }}
              >
                {s.en}
              </div>
            </div>
          );
        })}

        <div
          style={{
            position: 'absolute',
            bottom: 92,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            gap: 18,
            opacity: footIn,
            transform: `translateY(${(1 - footIn) * 8}px)`,
          }}
        >
          {['分類', '検索(RAG)', '下書き', '監査ログ'].map((chip, i) => (
            <div
              key={chip}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 18,
                fontFamily: fonts.mono,
                fontSize: 13,
                color: palette.muted,
                letterSpacing: '0.14em',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ fontFamily: fonts.jp }}>{chip}</span>
              {i < 3 ? <span style={{ color: palette.lineStrong }}>·</span> : null}
            </div>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
