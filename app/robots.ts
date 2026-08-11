import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin', '/dashboard', '/login'],
      },
    ],
    sitemap: 'https://hirebotai.in/sitemap.xml',
  };
}
