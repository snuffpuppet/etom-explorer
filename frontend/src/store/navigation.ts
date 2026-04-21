import { create } from 'zustand'

interface NavigationState {
  activeDomainId: string | null
  drillPath: string[]
  detailNodeId: string | null
  setActiveDomain: (id: string) => void
  selectNode: (id: string, level: number) => void
  /** Navigate to a node by setting the active domain + drill path. */
  navigateTo: (domainId: string, drillPath: string[]) => void
  openDetail: (nodeId: string) => void
  closeDetail: () => void
}

export const useNavigationStore = create<NavigationState>((set) => ({
  activeDomainId: null,
  drillPath: [],
  detailNodeId: null,
  setActiveDomain: (id) => set({ activeDomainId: id, drillPath: [] }),
  selectNode: (id, level) =>
    set((state) => ({
      drillPath: [...state.drillPath.slice(0, level - 1), id],
    })),
  navigateTo: (domainId, drillPath) =>
    set({ activeDomainId: domainId, drillPath }),
  openDetail: (nodeId) => set({ detailNodeId: nodeId }),
  closeDetail: () => set({ detailNodeId: null }),
}))
