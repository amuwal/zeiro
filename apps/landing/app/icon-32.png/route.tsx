import { ImageResponse } from 'next/og';

export const dynamic = 'force-static';

export function GET() {
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
        fontSize: 26,
        fontWeight: 800,
        letterSpacing: '-0.06em',
        position: 'relative',
        lineHeight: 1,
      }}
    >
      <span style={{ display: 'flex', marginTop: -1 }}>Z</span>
      <span
        style={{
          position: 'absolute',
          left: 7,
          right: 7,
          bottom: 4,
          height: 2,
          background: '#7ba66a',
          borderRadius: 1,
        }}
      />
    </div>,
    { width: 32, height: 32 },
  );
}
