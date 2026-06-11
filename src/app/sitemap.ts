import { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'
import { slugify } from '@/lib/utils'
import { COUNTRY_MAP, countryToSlug } from '@/lib/tour-country'

const BASE = 'https://namngantravel.com'

const STATIC_ROUTES: MetadataRoute.Sitemap = [
  { url: BASE,                          lastModified: new Date(), changeFrequency: 'weekly', priority: 1    },
  { url: `${BASE}/tours`,               lastModified: new Date(), changeFrequency: 'daily',  priority: 0.9  },
  { url: `${BASE}/tour-trong-nuoc`,     lastModified: new Date(), changeFrequency: 'daily',  priority: 0.8  },
  { url: `${BASE}/tour-nuoc-ngoai`,     lastModified: new Date(), changeFrequency: 'daily',  priority: 0.8  },
  { url: `${BASE}/diem-den`,            lastModified: new Date(), changeFrequency: 'daily',  priority: 0.8  },
  { url: `${BASE}/blog`,                lastModified: new Date(), changeFrequency: 'daily',  priority: 0.8  },
  { url: `${BASE}/tao-lich-trinh`,      lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7  },
  { url: `${BASE}/tin-tuc`,             lastModified: new Date(), changeFrequency: 'daily',  priority: 0.7  },
  { url: `${BASE}/lich-khoi-hanh`,      lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6  },
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    const { data: tours } = await supabase
      .from('tours')
      .select('id, slug, updated_at, detail_synced_at')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })

    const tourRoutes: MetadataRoute.Sitemap = (tours ?? []).flatMap(t => {
      const mod = t.detail_synced_at
        ? new Date(t.detail_synced_at)
        : t.updated_at ? new Date(t.updated_at) : new Date()
      const entries: MetadataRoute.Sitemap = []
      if (t.slug) {
        // canonical slug URL — highest priority
        entries.push({ url: `${BASE}/tour/${t.slug}`, lastModified: mod, changeFrequency: 'weekly', priority: 0.8 })
      }
      // backward-compat UUID URL — lower priority so it doesn't compete with canonical
      entries.push({ url: `${BASE}/tour/${t.id}`, lastModified: mod, changeFrequency: 'weekly', priority: 0.5 })
      return entries
    })

    const { data: articles } = await supabase
      .from('articles')
      .select('slug, updated_at')
      .eq('status', 'published')
      .order('updated_at', { ascending: false })

    const articleRoutes: MetadataRoute.Sitemap = (articles ?? []).map(a => ({
      url: `${BASE}/tin-tuc/${a.slug}`,
      lastModified: a.updated_at ? new Date(a.updated_at) : new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    }))

    const blogRoutes: MetadataRoute.Sitemap = (articles ?? []).map(a => ({
      url: `${BASE}/blog/${a.slug}`,
      lastModified: a.updated_at ? new Date(a.updated_at) : new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    }))

    const { data: destinations } = await supabase
      .from('featured_destinations')
      .select('name, updated_at')
      .eq('is_active', true)

    const destRoutes: MetadataRoute.Sitemap = (destinations ?? []).map(d => ({
      url: `${BASE}/diem-den/${slugify(d.name)}`,
      lastModified: d.updated_at ? new Date(d.updated_at) : new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    }))

    // /du-lich/[country] — programmatic SEO pages (static, high priority)
    const countryRoutes: MetadataRoute.Sitemap = Object.keys(COUNTRY_MAP).map(name => ({
      url: `${BASE}/du-lich/${countryToSlug(name)}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.85,
    }))

    return [...STATIC_ROUTES, ...countryRoutes, ...tourRoutes, ...articleRoutes, ...blogRoutes, ...destRoutes]
  } catch {
    return STATIC_ROUTES
  }
}
