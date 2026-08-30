import type { MetadataRoute } from 'next';

import { absoluteUrl, publicTools } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const pages: MetadataRoute.Sitemap = [
    { url: absoluteUrl('/'), changeFrequency: 'weekly', priority: 1 },
    { url: absoluteUrl('/acerca-de'), changeFrequency: 'monthly', priority: 0.5 },
    { url: absoluteUrl('/privacidad'), changeFrequency: 'yearly', priority: 0.3 },
    { url: absoluteUrl('/terminos'), changeFrequency: 'yearly', priority: 0.3 },
  ];

  return [
    ...pages,
    ...publicTools.map((tool) => ({
      url: absoluteUrl(tool.path),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
  ];
}
