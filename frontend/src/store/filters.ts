import { create } from 'zustand'
import type { ScopeStatus, ReviewStatus } from '../types/classification'

export const S2R_VGS = ['Strategy Management', 'Capability Management', 'Business Value Development']
export const OPS_VGS = ['Operations Readiness & Support', 'Fulfillment', 'Assurance', 'Billing']

interface FilterState {
  scopeStatuses: ScopeStatus[]
  reviewStatuses: ReviewStatus[]
  selectedTags: string[]
  selectedTeam: string | null
  selectedVGs: string[]
  toggleScopeStatus: (s: ScopeStatus) => void
  toggleReviewStatus: (r: ReviewStatus) => void
  toggleTag: (tagId: string) => void
  setTeam: (team: string | null) => void
  toggleVG: (vg: string) => void
  toggleLifecycleArea: (area: 'S2R' | 'OPS') => void
  clearAll: () => void
}

export const useFilterStore = create<FilterState>((set) => ({
  scopeStatuses: [],
  reviewStatuses: [],
  selectedTags: [],
  selectedTeam: null,
  selectedVGs: [],

  toggleScopeStatus: (s) => set((st) => ({
    scopeStatuses: st.scopeStatuses.includes(s)
      ? st.scopeStatuses.filter(x => x !== s)
      : [...st.scopeStatuses, s],
  })),

  toggleReviewStatus: (r) => set((st) => ({
    reviewStatuses: st.reviewStatuses.includes(r)
      ? st.reviewStatuses.filter(x => x !== r)
      : [...st.reviewStatuses, r],
  })),

  toggleTag: (tagId) => set((st) => ({
    selectedTags: st.selectedTags.includes(tagId)
      ? st.selectedTags.filter(x => x !== tagId)
      : [...st.selectedTags, tagId],
  })),

  setTeam: (team) => set({ selectedTeam: team }),

  toggleVG: (vg) => set((st) => ({
    selectedVGs: st.selectedVGs.includes(vg)
      ? st.selectedVGs.filter(x => x !== vg)
      : [...st.selectedVGs, vg],
  })),

  toggleLifecycleArea: (area) => set((st) => {
    const groupVGs = area === 'S2R' ? S2R_VGS : OPS_VGS
    const allSelected = groupVGs.every(vg => st.selectedVGs.includes(vg))
    if (allSelected) {
      return { selectedVGs: st.selectedVGs.filter(vg => !groupVGs.includes(vg)) }
    }
    return { selectedVGs: [...new Set([...st.selectedVGs, ...groupVGs])] }
  }),

  clearAll: () => set({
    scopeStatuses: [],
    reviewStatuses: [],
    selectedTags: [],
    selectedTeam: null,
    selectedVGs: [],
  }),
}))
