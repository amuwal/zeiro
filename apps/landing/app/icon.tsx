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
        fontFamily: 'system-ui, sans-serif',
        fontSize: 188,
        fontWeight: 700,
        letterSpacing: '-0.06em',
      }}
    >
      z
    </div>,
    { ...size },
  );
}
