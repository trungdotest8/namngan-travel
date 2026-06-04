import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/crm/', '/login/', '/api/'],
      },
    ],
    sitemap: 'https://namngantravel.com/sitemap.xml',
    host: 'https://namngantravel.com',
  }
}
