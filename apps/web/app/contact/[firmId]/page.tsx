import { getFirm, getFirmChannel } from '@zeiro/db';
import { notFound } from 'next/navigation';
import { WebContactForm } from '@/components/contact/web-contact-form';

export const metadata = {
  title: 'お問い合わせ',
};

export default async function ContactPage({ params }: { params: Promise<{ firmId: string }> }) {
  const { firmId } = await params;
  const firm = await getFirm(firmId).catch(() => null);
  if (!firm) notFound();

  const channel = await getFirmChannel(firmId, 'web');
  const enabled = channel?.enabled ?? false;

  return (
    <main style={pageStyle}>
      <div style={containerStyle}>
        <header style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--muted-2)',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
            }}
          >
            {firm.name}
          </div>
          <h1
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 28,
              fontWeight: 600,
              letterSpacing: '-0.02em',
              margin: 0,
            }}
          >
            お問い合わせ
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: 13.5, marginTop: 4, lineHeight: 1.7 }}>
            ご質問・ご相談を下記フォームからお送りください。担当者が内容を確認のうえ、ご登録いただいたメールアドレス宛にご返信いたします。
          </p>
        </header>

        {enabled ? (
          <WebContactForm firmId={firmId} />
        ) : (
          <div
            style={{
              border: '1px solid var(--line)',
              borderRadius: 12,
              padding: '24px',
              background: 'var(--surface-2)',
              color: 'var(--muted)',
              fontSize: 13,
            }}
          >
            現在Webからのお問い合わせは受け付けておりません。お手数ですが、メールまたはお電話でご連絡ください。
          </div>
        )}

        <footer
          style={{
            color: 'var(--muted-2)',
            fontSize: 11,
            fontFamily: 'var(--font-mono)',
            paddingTop: 12,
            borderTop: '1px solid var(--line)',
          }}
        >
          Powered by Zeiro · 通信は暗号化されます
        </footer>
      </div>
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: 'var(--bg)',
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'center',
  padding: '64px 24px',
};

const containerStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 560,
  display: 'flex',
  flexDirection: 'column',
  gap: 28,
};
