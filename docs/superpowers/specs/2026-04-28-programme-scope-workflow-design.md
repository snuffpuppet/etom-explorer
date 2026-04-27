# eTOM Explorer — Programme Scope Workflow Design

**Date:** 2026-04-28
**Status:** Approved

## Context

The eTOM Explorer is being used to support a structured scoping exercise for a specific OSS change programme covering NBN TC4 services. The programme scope includes: service & resource inventory, service & resource catalog, resource management, fulfilment and activation workflows moving to NOrC, new integrations (new internal sources of truth), new platform (NOrC/UIV), and new delivery pipelines.

BSS processes (Customer, Product, Market, Sales domains) are explicitly out of scope — the BSS front-end remains unchanged. The objective is to work through L2 eTOM processes, determine programme relevance, assign change streams, query current process owners, and identify gaps (processes that must exist post-change but are currently uncovered).

---

## 1. Data Model Changes

### 1.1 `scope_status` replaces `category`

The existing `category` field (`oss | oss_bss | bss | other | unclassified`) is retired and replaced by `scope_status`.

```
ScopeStatusType = "tbd" | "in_scope" | "adjacent" | "out_of_scope" | "gap"
```

| Value | Meaning | Replaces |
|-------|---------|---------|
| `tbd` | Not yet assessed | `unclassified` |
| `in_scope` | Directly impacted by the OSS change programme | `oss` |
| `adjacent` | OSS-adjacent — team may have built tools that interact with OSS | `oss_bss` |
| `out_of_scope` | No OSS touch — BSS process or confirmed exclusion | `bss`, `other`, and the `descoped` concept |
| `gap` | Needs to exist post-change but currently uncovered | *(new)* |

### 1.2 `reason` field added to Classification

An optional `reason` field is added to the `Classification` model. It captures why a scope decision was made. It is independent of `notes` (which is for general annotations).

```python
class Classification(BaseModel):
    id: str
    name: str
    scope_status: ScopeStatusType = "tbd"
    review_status: ReviewStatusType = "unreviewed"
    reason: str = ""
    notes: str = ""
```

`ClassificationUpdate` is updated in the same way.

### 1.3 `DescopedEntry` removed

The `DescopedEntry` and `DescopedUpdate` models are removed. The `descoped` router is removed. The `descoped.md` data file is migrated at backend startup (see §1.5).

### 1.4 `review_status` unchanged

`review_status` (`unreviewed | under_review | classified`) is retained as-is. It tracks workflow progress through the assessment exercise independent of the scope decision.

### 1.5 Data migration (automatic, at startup)

Two migrations run at backend startup before any request is served:

**`classifications.md` migration:**
The persistence layer detects whether the table uses a `category` column. If so, it reads and rewrites the file mapping:
- `oss` → `in_scope`
- `oss_bss` → `adjacent`
- `bss` → `out_of_scope`
- `other` / `unclassified` → `tbd`

A `reason` column is added (empty for existing rows). The column is renamed to `scope_status`.

**`descoped.md` migration:**
Each row in `descoped.md` is upserted into `classifications.md` as:
- `scope_status = out_of_scope`
- `reason = <descoped reason>`
- `notes = <descoped notes>`

If a process already has a classification entry, `scope_status` is unconditionally overridden to `out_of_scope` (descoped takes precedence) and `reason` is populated from the descoped reason; existing `notes` values are combined (descoped notes appended if non-empty). If `descoped.md` does not exist, this step is skipped. The file is left in place but ignored after migration.

---

## 2. Visual Identity for Scope Statuses

Tile left border colour, status dot colour, and filter button styling:

| Status | Colour token | Label |
|--------|-------------|-------|
| `tbd` | gray-600 | TBD |
| `in_scope` | green-500 | In Scope |
| `adjacent` | blue-500 | Adjacent |
| `out_of_scope` | red-500 | Out of Scope |
| `gap` | amber-500 | Gap |

`out_of_scope` tiles use a red border (same hue as the former descoped treatment) but are **not** muted by default — the `isMuted` / opacity treatment tied to the old 3-way toggle is removed. Users hide out_of_scope processes by excluding that value from the scope status filter. `gap` tiles use amber to signal "needs attention — action required."

---

## 3. Classification Panel (✏️ Edit)

The edit panel (opened via the ✏️ tile button or right-click) is updated:

- **Scope status** — radio selector replacing the old category radio. Five options: TBD · In Scope · Adjacent · Out of Scope · Gap.
- **Reason** — optional text input below the scope selector. Placeholder: "Why this scope decision…". Shown for all scope statuses (not only out_of_scope).
- **Review status** — dropdown, unchanged.
- **Notes** — textarea, unchanged.
- **Tag assignment** — added (was previously only in the ⓘ detail panel). Renders the same tag toggle UI: each defined tag shown as a toggleable chip with an optional cascade (↓) button when selected.
- **Descope form removed** — the "Mark Descoped" button and inline descope form are removed. Descoping is now done by setting `scope_status = out_of_scope` with an optional reason.

The ✏️ panel becomes the primary quick-edit surface for scope + tags + reason + notes. The ⓘ detail panel remains the full read view (descriptions, teams, value streams, notes editor).

---

## 4. Filter Bar

### 4.1 Scope status toggles
The five category toggle buttons (OSS · OSS+BSS · BSS · Other) are replaced by five scope status buttons:

`TBD` · `In Scope` · `Adjacent` · `Out of Scope` · `Gap`

Inactive style: coloured border, coloured text. Active style: filled background. Multiple can be active simultaneously (OR logic, same as current category filter).

### 4.2 Descoped 3-way toggle removed
The `Descoped: Show / Dim / Hide` toggle is removed. Descoped processes now appear as `out_of_scope` and are controlled by the scope status filter.

### 4.3 Lifecycle area toggle (new)
Two buttons — `S2R` and `OPS` — are added as a coarse pre-filter before the fine VG buttons.

- `S2R` activates vertical groups: SMT, CAP, BVD
- `OPS` activates vertical groups: ORS, FUL, ASR, BIL
- The S2R/OPS buttons and individual VG buttons compose: selecting `OPS` then `FUL` in the VG row narrows to Fulfillment processes within Operations.
- Selecting `S2R` or `OPS` toggles the corresponding VG set as a group; deselecting deactivates all VGs in that group.

### 4.4 VG filter button tooltips (bug fix)
Each VG abbreviation button in the filter bar gains a `title` attribute with the full vertical group name (e.g. `title="Operations Readiness & Support"`). Matches the existing behaviour on tile VG chips.

### 4.5 Active filter chips
Active scope status chips are added to the active filter summary row. VG active chips show the full name (not abbreviation).

---

## 5. L2 List View

### 5.1 Placement
A **"List"** tab is added at the right end of the existing domain tab bar (`DomainTabs`). It is always visible regardless of the active domain.

### 5.2 Content
The List view renders all L2 processes (`level === 2`) across all domains in a single scrollable table. The table respects all active FilterBar filters (scope status, review status, VG, tags, team, lifecycle area).

### 5.3 Columns

| Column | Content | Notes |
|--------|---------|-------|
| Name | Process name + ID in muted monospace below | Clicking the row opens the ProcessDetail sidebar |
| Domain | Domain name | Text label |
| VG | Vertical group abbreviation chip(s) | Same chip style as tiles |
| Scope | Inline dropdown | Click to change `scope_status` without opening a panel — the primary productivity affordance for the scoping pass |
| Tags | Tag badge(s) | Read-only in table; edit via panel |
| Team | Team badge(s) | Read-only in table; edit via panel |
| Status | Review status pill | `unreviewed` / `under_review` / `classified` |

### 5.4 Inline scope editing
The Scope column renders a compact button showing the current scope_status label and colour. Clicking it opens a small inline dropdown with the five scope status options. Selecting an option immediately saves via the classifications API — no panel required. This is the key affordance for working through the L2 list quickly.

### 5.5 Sorting
Columns are sortable by clicking the column header. Default sort: domain ASC, then name ASC. Secondary sort always falls back to name ASC.

### 5.6 Row click
Clicking anywhere on a row except the Scope dropdown opens the ProcessDetail sidebar panel (same as the ⓘ button on tiles). The sidebar is overlaid on the list view; closing it returns focus to the list.

---

## 6. Pre-seeded Change Stream Tags

On first startup (when `tags.md` has no entries matching the change stream names), the backend seeds the following tag definitions. These can be edited/deleted by the user like any other tag.

| Tag name | Colour |
|----------|--------|
| service-inventory | #3b82f6 |
| service-catalog | #6366f1 |
| resource-mgmt | #10b981 |
| norc-fulfilment | #f59e0b |
| new-integrations | #8b5cf6 |
| new-platform | #ec4899 |
| delivery-pipeline | #14b8a6 |

Seeding is idempotent — tags are not re-created if they already exist.

---

## 7. Removed Features

| Feature | Fate |
|---------|------|
| `category` field (oss/oss_bss/bss/other/unclassified) | Replaced by `scope_status` |
| `DescopedEntry` / `descoped.md` | Migrated into classifications; `descoped` router removed |
| "Mark Descoped" button in ClassificationPanel | Removed; use `out_of_scope` scope status |
| Descoped 3-way toggle in FilterBar | Removed |

---

## 8. Out of Scope for This Phase

- Notes field on team assignments
- Export format changes (export will automatically include new scope_status data)
- Progress/summary dashboard (derivable from scope status filter counts; can be added later)
- Value stream changes
