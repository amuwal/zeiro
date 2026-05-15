import type { MetadataRoute } from 'next';
import { BRAND, SITE_URL } from '@/lib/seo';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${BRAND.name} — ${BRAND.taglineJa}`,
    short_name: BRAND.name,
    description: BRAND.descriptionJa,
    start_url: '/',
    scope: '/',
    display: 'browser',
    lang: 'ja-JP',
    dir: 'ltr',
    background_color: '#fafafa',
    theme_color: '#0a0a0a',
    categories: ['business', 'productivity', 'finance'],
    icons: [
      { src: '/icon-32.png', sizes: '32x32', type: 'image/png' },
      { src: '/icon', sizes: '256x256', type: 'image/png' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png' },
    ],
    related_applications: [
      { platform: 'webapp', url: `${SITE_URL}/` },
      { platform: 'webapp', url: 'https://app.zeiro.io/' },
    ],
  };
}
