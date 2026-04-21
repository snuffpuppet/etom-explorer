import { create } from 'zustand'
import type { Category, ReviewStatus } from '../types/classification'

interface FilterState {
  categories: Category[]
  reviewStatuses: ReviewStatus[]
  showDescoped: 'show' | 'dim' | 'hide'
  toggleCategory: (c: Category) => void
  toggleReviewStatus: (r: ReviewStatus) => void
  setShowDescoped: (v: 'show' | 'dim' | 'hide') => void
  clearAll: () => void
}

export const useFilterStore = create<FilterState>((set) => ({
  categories: [],
  reviewStatuses: [],
  showDescoped: 'dim',
  toggleCategory: (c) => set((s) => ({
    categories: s.categories.includes(c) ? s.categories.filter(x => x !== c) : [...s.categories, c]
  })),
  toggleReviewStatus: (r) => set((s) => ({
    reviewStatuses: s.reviewStatuses.includes(r) ? s.reviewStatuses.filter(x => x !== r) : [...s.reviewStatuses, r]
  })),
  setShowDescoped: (v) => set({ showDescoped: v }),
  clearAll: () => set({ categories: [], reviewStatuses: [], showDescoped: 'dim' }),
}))
