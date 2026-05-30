import { create } from 'zustand'
import type { Article, ArticleSourceType } from '@/types/news.types'

export type CmsFilter = ArticleSourceType | 'all'

interface CmsState {
  articles:     Article[]
  activeFilter: CmsFilter
  isLoading:    boolean
  lastFetched:  string | null

  setArticles:    (articles: Article[]) => void
  setFilter:      (filter: CmsFilter) => void
  setLoading:     (loading: boolean) => void
  setLastFetched: (time: string) => void

  filtered: () => Article[]
}

export const useCmsStore = create<CmsState>((set, get) => ({
  articles:     [],
  activeFilter: 'all',
  isLoading:    false,
  lastFetched:  null,

  setArticles:    (articles)    => set({ articles }),
  setFilter:      (activeFilter) => set({ activeFilter }),
  setLoading:     (isLoading)   => set({ isLoading }),
  setLastFetched: (lastFetched) => set({ lastFetched }),

  filtered: () => {
    const { articles, activeFilter } = get()
    return activeFilter === 'all'
      ? articles
      : articles.filter((a) => a.source_type === activeFilter)
  },
}))
