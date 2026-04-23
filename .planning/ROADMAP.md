# Roadmap: eTOM Explorer — UI Polish Milestone

## Overview

Nine tightly related frontend improvements ship as a single phase. The work touches three areas of the existing UI: tile information density (ID display, hover popover, VG chip clarity), vertical group filtering in the FilterBar, and ClassificationPanel usability as a centred modal. All changes are pure TypeScript/React/Tailwind — no backend involvement.

## Phases

- [ ] **Phase 1: UI Polish** - Tile clarity, VG filtering, and ClassificationPanel modal

## Phase Details

### Phase 1: UI Polish
**Goal**: Users can read tile metadata at a glance, filter by vertical group, and edit classifications without viewport-edge clipping
**Depends on**: Nothing (first phase)
**Requirements**: TILE-01, TILE-02, TILE-03, VG-01, VG-02, VG-03, EDIT-01, EDIT-02, EDIT-03
**Success Criteria** (what must be TRUE):
  1. Every tile shows its process ID and level in muted monospace text below the process name
  2. Hovering a tile for 250ms reveals a description popover; the ⓘ and ✏️ footer icons remain fully clickable
  3. VG chips display a tooltip with the full vertical group name and are preceded by a `vg` micro-label
  4. FilterBar includes VG toggle buttons that subset the tree; active VG filters appear as removable chips in the active-filter summary
  5. ClassificationPanel opens as a centred fixed modal with a backdrop, comfortable padding, and textareas of at least 4 rows
**Plans**: 3 plans
Plans:
- [ ] 01-01-PLAN.md — Tile info density: ID+level line, 250ms hover popover, VG micro-label + tooltips (TILE-01, TILE-02, TILE-03)
- [ ] 01-02-PLAN.md — VG filter: store state, FilterBar toggles + active chips, TreeView filter pipeline (VG-01, VG-02, VG-03)
- [ ] 01-03-PLAN.md — ClassificationPanel modal: centred fixed layout, 4-row textareas, section divider (EDIT-01, EDIT-02, EDIT-03)
**UI hint**: yes

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. UI Polish | 0/3 | Not started | - |
