import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Zeiro — AI inquiry triage & drafting for tax firms';

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '88px',
        background: 'linear-gradient(135deg, #0c3a38 0%, #115150 60%, #176b67 100%)',
        color: '#ffffff',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <div
          style={{
            width: '92px',
            height: '92px',
            borderRadius: '24px',
            background: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '60px',
            fontWeight: 700,
            color: '#12706c',
          }}
        >
          Z
        </div>
        <div style={{ fontSize: '60px', fontWeight: 700, letterSpacing: '-0.03em' }}>Zeiro</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            fontSize: '68px',
            fontWeight: 600,
            lineHeight: 1.15,
            letterSpacing: '-0.02em',
          }}
        >
          <div>AI inquiry triage &amp; cited drafting,</div>
          <div>built for tax firms.</div>
        </div>
        <div style={{ display: 'flex', fontSize: '30px', color: 'rgba(255,255,255,0.72)' }}>
          Inbound → triage → cited draft → review → send.
        </div>
      </div>
    </div>,
    { ...size },
  );
}
