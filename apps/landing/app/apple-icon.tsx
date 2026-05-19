import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';
export const dynamic = 'force-static';

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#0a0a0a',
        color: '#fafafa',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, -apple-system, "Helvetica Neue", sans-serif',
        fontSize: 140,
        fontWeight: 800,
        letterSpacing: '-0.06em',
        position: 'relative',
        lineHeight: 1,
      }}
    >
      <span style={{ display: 'flex', marginTop: -6 }}>Z</span>
      <span
        style={{
          position: 'absolute',
          left: 40,
          right: 40,
          bottom: 26,
          height: 7,
          background: '#7ba66a',
          borderRadius: 3,
        }}
      />
    </div>,
    { ...size },
  );
}
