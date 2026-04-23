# Requirements: eTOM Explorer — UI Polish Milestone

**Defined:** 2026-04-23
**Core Value:** A team can quickly navigate the eTOM process hierarchy and annotate any process with classification, ownership, and context — without touching a spreadsheet.

## v1 Requirements

### Tile Information Density

- [ ] **TILE-01**: Process ID and level are displayed below the process name on every tile (e.g. `1.3.2.4 · L4`), in monospace muted text
- [ ] **TILE-02**: Brief description is shown in a hover popover that appears after 250ms and is `pointer-events-none` so ⓘ and ✏️ footer icons remain fully clickable
- [ ] **TILE-03**: VG chips display a `title` tooltip with the full vertical group name, and a `vg` micro-label precedes the chip group so the section is self-explanatory

### Vertical Group Filtering

- [ ] **VG-01**: FilterBar includes toggle buttons for each vertical group (Fulfillment, Assurance, Billing, ORS, Strategy Management, Business Value Development, Capability Management), colour-matched to existing chip colours
- [ ] **VG-02**: Selecting one or more VG filters subsets the tree to show only processes belonging to any selected vertical group
- [ ] **VG-03**: Active VG filters appear as removable chips in the active-filter summary (consistent with category/tag/team filter pattern)

### Edit Panel Usability

- [ ] **EDIT-01**: ClassificationPanel renders as a centred fixed modal (~480px wide) with a backdrop, replacing the `absolute left-full` anchor that causes viewport-edge clipping
- [ ] **EDIT-02**: Notes and descope-reason textareas are at least 4 rows
- [ ] **EDIT-03**: Modal has comfortable internal padding and clear visual separation between sections

## v2 Requirements

### Tile Interactions

- **TILE-V2-01**: Extended description accessible from the hover popover (e.g. "More..." link opens detail panel)
- **TILE-V2-02**: Keyboard-accessible tile navigation (arrow keys for drill-down)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Backend API changes | All v1 requirements are frontend-only |
| Authentication / RBAC | Not a stated requirement |
| Mobile / responsive layout | Desktop-only tool |
| Dark/light theme toggle | Dark theme is the established aesthetic |
| VG data editable by users | VG membership comes from the Excel source; not user-editable |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| TILE-01 | Phase 1 | Pending |
| TILE-02 | Phase 1 | Pending |
| TILE-03 | Phase 1 | Pending |
| VG-01 | Phase 1 | Pending |
| VG-02 | Phase 1 | Pending |
| VG-03 | Phase 1 | Pending |
| EDIT-01 | Phase 1 | Pending |
| EDIT-02 | Phase 1 | Pending |
| EDIT-03 | Phase 1 | Pending |

**Coverage:**
- v1 requirements: 9 total
- Mapped to phases: 9
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-23*
*Last updated: 2026-04-23 after initial definition*
