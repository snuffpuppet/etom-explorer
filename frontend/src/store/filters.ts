import { create } from 'zustand'
import type { Category, ReviewStatus } from '../types/classification'

interface FilterState {
  categories: Category[]
  reviewStatuses: ReviewStatus[]
  showDescoped: 'show' | 'dim' | 'hide'
  selectedTags: string[]
  selectedTeam: string | null
  selectedVGs: string[]
  toggleCategory: (c: Category) => void
  toggleReviewStatus: (r: ReviewStatus) => void
  setShowDescoped: (v: 'show' | 'dim' | 'hide') => void
  toggleTag: (tagId: string) => void
  setTeam: (team: string | null) => void
  toggleVG: (vg: string) => void
  clearAll: () => void
}

export const useFilterStore = create<FilterState>((set) => ({
  categories: [],
  reviewStatuses: [],
  showDescoped: 'dim',
  selectedTags: [],
  selectedTeam: null,
  selectedVGs: [],
  toggleCategory: (c) => set((s) => ({
    categories: s.categories.includes(c) ? s.categories.filter(x => x !== c) : [...s.categories, c]
  })),
  toggleReviewStatus: (r) => set((s) => ({
    reviewStatuses: s.reviewStatuses.includes(r) ? s.reviewStatuses.filter(x => x !== r) : [...s.reviewStatuses, r]
  })),
  setShowDescoped: (v) => set({ showDescoped: v }),
  toggleTag: (tagId) => set((s) => ({
    selectedTags: s.selectedTags.includes(tagId) ? s.selectedTags.filter(x => x !== tagId) : [...s.selectedTags, tagId]
  })),
  setTeam: (team) => set({ selectedTeam: team }),
  toggleVG: (vg) => set((s) => ({
    selectedVGs: s.selectedVGs.includes(vg) ? s.selectedVGs.filter(x => x !== vg) : [...s.selectedVGs, vg]
  })),
  clearAll: () => set({ categories: [], reviewStatuses: [], showDescoped: 'dim', selectedTags: [], selectedTeam: null, selectedVGs: [] }),
}))
