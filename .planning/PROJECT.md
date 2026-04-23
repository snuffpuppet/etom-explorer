# eTOM Explorer — UI Polish Milestone

## What This Is

eTOM Explorer is an internal tool for exploring and annotating the TM Forum GB921 eTOM Business Process Framework. It parses a TM Forum Excel file into a browsable process tree and lets teams classify, tag, assign, and annotate processes with notes, teams, and value stream mappings.

## Core Value

A team can quickly navigate the eTOM process hierarchy and annotate any process with classification, ownership, and context — without touching a spreadsheet.

## Requirements

### Validated

- ✓ eTOM Excel parsed at startup into an in-memory process tree (L0–L7) — existing
- ✓ Browsable tile-based tree view with drill-down navigation — existing
- ✓ Process classifications (OSS/BSS/Other, review status) with colour-coded left borders — existing
- ✓ Descoped process management (mark, dim, hide) — existing
- ✓ Tags and tag assignments with colour-coded badges — existing
- ✓ Team assignments per process — existing
- ✓ Freeform notes per process (Markdown, persisted to `data/notes/`) — existing
- ✓ Value streams view — existing
- ✓ Full-text search — existing
- ✓ Chat/LLM integration for process Q&A — existing
- ✓ Export dialog — existing
- ✓ FilterBar with category, review status, descoped, tag, and team filters — existing
- ✓ Vertical group chips on tiles (FUL, ASR, BIL, etc.) — decorative, existing

### Active

- [ ] **UI-01**: Process ID and level displayed below process name on every tile (e.g. `1.3.2.4 · L4`)
- [ ] **UI-02**: Vertical group filter toggles in FilterBar — click to subset tree to matching processes
- [ ] **UI-03**: VG chip clarity — tooltip with full vertical group name + `vg` micro-label before chip group
- [ ] **UI-04**: Brief description hover popover on tiles — `pointer-events-none` so ⓘ / ✏️ icons remain clickable
- [ ] **UI-05**: ClassificationPanel converted to centred modal — wider (~480px), textarea rows increased, proper backdrop

### Out of Scope

- Authentication / access control — no multi-user or permission requirements stated
- Backend changes — all active requirements are pure frontend
- Mobile / responsive layout — tool is used on desktop
- Dark/light theme toggle — committed to dark theme

## Context

- Stack: FastAPI + Python backend, React + Vite + TypeScript frontend, Zustand for navigation + filter state, React Query for data fetching
- Persistence: Markdown files with YAML frontmatter in `./data/` — no database
- Excel source file is never modified; tree is rebuilt from it on every startup
- Existing `FilterBar` uses toggle button patterns (category, review status, tags, team) — VG filters should match this pattern
- `ProcessTile` already has `hovered` state wired — description popover can use it
- `ClassificationPanel` is currently positioned `absolute left-full` next to its tile — causes viewport edge clipping
- Vertical group full names: Fulfillment, Assurance, Billing, Operations Readiness & Support, Strategy Management, Business Value Development, Capability Management

## Constraints

- **Tech stack**: React + TypeScript + Tailwind — no new libraries unless trivial (e.g. a Portal helper)
- **No backend changes**: All five requirements are frontend-only
- **Aesthetic**: Dark theme, dense information layout — changes must not add visual noise or wasted space

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Hover popover is `pointer-events-none` | ⓘ and ✏️ icons must remain clickable; popover is read-only | — Pending |
| ClassificationPanel → centred modal | Fixes viewport-edge clipping; provides room to breathe | — Pending |
| VG filter uses existing FilterBar toggle pattern | Consistency with category/tag/team filters already in place | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-23 after initialization*
