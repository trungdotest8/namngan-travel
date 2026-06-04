import { MetadataRoute } from 'next'

const BASE = 'https://namngantravel.com'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: BASE, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE}/tours`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE}/tour-trong-nuoc`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${BASE}/tour-nuoc-ngoai`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${BASE}/tin-tuc`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
    { url: `${BASE}/lich-khoi-hanh`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
  ]
}
