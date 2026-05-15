import { ImageResponse } from 'next/og';
import { BRAND } from '@/lib/seo';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = `${BRAND.name} — ${BRAND.taglineJa}`;
export const dynamic = 'force-static';

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#fafafa',
        padding: 80,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div
          style={{
            width: 56,
            height: 56,
            background: '#0a0a0a',
            color: '#fafafa',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 38,
            fontWeight: 700,
            letterSpacing: '-0.06em',
            borderRadius: 12,
          }}
        >
          z
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 36, fontWeight: 600, color: '#0a0a0a', letterSpacing: '-0.02em' }}>
            {BRAND.name}
          </div>
          <div
            style={{
              fontSize: 14,
              color: '#8a8a8a',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginTop: 4,
            }}
          >
            tax-office agent
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div
          style={{
            display: 'flex',
            fontSize: 84,
            fontWeight: 600,
            color: '#0a0a0a',
            letterSpacing: '-0.035em',
            lineHeight: 1.05,
          }}
        >
          顧客対応を、自動で。
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            fontSize: 84,
            fontWeight: 600,
            color: '#0a0a0a',
            letterSpacing: '-0.035em',
            lineHeight: 1.05,
          }}
        >
          <span>所長は</span>
          <span style={{ color: '#8a8a8a' }}>監督に</span>
          <span>。</span>
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 26,
            color: '#525252',
            lineHeight: 1.4,
            marginTop: 12,
          }}
        >
          {BRAND.taglineJa}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 28,
          fontSize: 16,
          color: '#8a8a8a',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          borderTop: '1px solid #e8e8e8',
          paddingTop: 24,
        }}
      >
        <span>自動回答率 73%</span>
        <span>·</span>
        <span>平均初回返答 22 min</span>
        <span>·</span>
        <span>引用付き 100%</span>
      </div>
    </div>,
    { ...size },
  );
}
