import { ImageResponse } from 'next/og';

export const size = { width: 256, height: 256 };
export const contentType = 'image/png';
export const dynamic = 'force-static';

export default function Icon() {
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
        fontSize: 196,
        fontWeight: 800,
        letterSpacing: '-0.06em',
        position: 'relative',
        lineHeight: 1,
      }}
    >
      <span style={{ display: 'flex', marginTop: -8 }}>Z</span>
      <span
        style={{
          position: 'absolute',
          left: 56,
          right: 56,
          bottom: 36,
          height: 10,
          background: '#7ba66a',
          borderRadius: 4,
        }}
      />
    </div>,
    { ...size },
  );
}
