import { create } from 'zustand'

interface NavigationState {
  activeDomainId: string | null
  drillPath: string[]
  setActiveDomain: (id: string) => void
  selectNode: (id: string, level: number) => void
}

export const useNavigationStore = create<NavigationState>((set) => ({
  activeDomainId: null,
  drillPath: [],
  setActiveDomain: (id) => set({ activeDomainId: id, drillPath: [] }),
  selectNode: (id, level) =>
    set((state) => ({
      drillPath: [...state.drillPath.slice(0, level - 1), id],
    })),
}))
