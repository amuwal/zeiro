import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const sections = ['', '#channels', '#knowledge', '#citations', '#confidence', '#memory', '#numbers', '#cta'];
  return sections.map((hash) => ({
    url: `${SITE_URL}/${hash}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: hash === '' ? 1 : 0.6,
  }));
}
