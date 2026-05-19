import { Analytics } from '@vercel/analytics/next';
import { Inter_Tight, JetBrains_Mono, Newsreader, Noto_Sans_JP } from 'next/font/google';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { JsonLd } from '@/components/json-ld';
import { BRAND, SITE_URL, structuredData } from '@/lib/seo';
import './globals.css';

const interTight = Inter_Tight({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-inter-tight',
  display: 'swap',
});

const notoSansJp = Noto_Sans_JP({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-noto-jp',
  display: 'swap',
  preload: false,
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-jetbrains',
  display: 'swap',
});

const newsreader = Newsreader({
  subsets: ['latin'],
  weight: ['400', '500'],
  style: ['italic', 'normal'],
  variable: '--font-newsreader',
  display: 'swap',
});

const title = `${BRAND.name} — ${BRAND.taglineJa}`;
const keywords = [
  'Zeiro',
  'zeiro',
  'ゼイロ',
  'ZEIRO',
  '税理士 AI',
  '税理士事務所 AI',
  '税理士事務所 顧客対応',
  '税理士 顧問先 問い合わせ',
  '会計事務所 自動返信',
  'メール 自動返信 税理士',
  'LINE 公式 税理士',
  'AI エージェント 税理士',
  'tax accountant AI agent Japan',
  'Japanese tax office AI',
  '税理士法 守秘義務',
  '電子申告 e-Tax AI',
];

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: title, template: `%s · ${BRAND.name}` },
  description: BRAND.descriptionJa,
  applicationName: BRAND.name,
  generator: 'Next.js',
  keywords,
  authors: [{ name: BRAND.name, url: SITE_URL }],
  creator: BRAND.name,
  publisher: BRAND.name,
  category: 'business',
  formatDetection: { email: false, address: false, telephone: false },
  alternates: {
    canonical: '/',
    languages: { 'ja-JP': '/', 'x-default': '/' },
  },
  openGraph: {
    type: 'website',
    siteName: BRAND.name,
    title,
    description: BRAND.descriptionJa,
    url: SITE_URL,
    locale: BRAND.locale,
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: `${BRAND.name} — ${BRAND.taglineJa}`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description: BRAND.descriptionJa,
    images: ['/opengraph-image'],
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  icons: {
    icon: [
      { url: '/icon-32.png', type: 'image/png', sizes: '32x32' },
      { url: '/icon', type: 'image/png', sizes: '256x256' },
    ],
    shortcut: [{ url: '/icon-32.png' }],
    apple: [{ url: '/apple-icon', type: 'image/png', sizes: '180x180' }],
  },
  manifest: '/manifest.webmanifest',
  other: {
    'application-name': BRAND.name,
    'msapplication-TileColor': '#0a0a0a',
    'theme-color': '#fafafa',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fafafa' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
};

const fontClass = [interTight.variable, notoSansJp.variable, jetbrainsMono.variable, newsreader.variable].join(' ');

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja" className={fontClass}>
      <body>
        {structuredData().map((data, i) => (
          <JsonLd key={i} data={data} />
        ))}
        {children}
        <Analytics />
      </body>
    </html>
  );
}
