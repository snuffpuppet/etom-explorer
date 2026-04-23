---
phase: 01-ui-polish
reviewed: 2026-04-23T00:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - frontend/src/components/ProcessTile.tsx
  - frontend/src/store/filters.ts
  - frontend/src/components/FilterBar.tsx
  - frontend/src/components/TreeView.tsx
  - frontend/src/components/ClassificationPanel.tsx
findings:
  critical: 0
  warning: 4
  info: 3
  total: 7
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-04-23T00:00:00Z
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

Five frontend React/TypeScript files were reviewed covering: ProcessTile (hover popover + VG chips), filters Zustand store (VG filter state), FilterBar (VG toggle buttons + active chips), TreeView (VG filter wiring), and ClassificationPanel (fixed modal conversion).

The overall quality is good. The VG filter is correctly plumbed end-to-end and the modal conversion is clean. Four warnings were found — two are real behaviour bugs (popover position and hover-timer leak), one is a logic inconsistency in VG key casing that will silently fail to render chips for some nodes, and one is an accessibility/usability gap in the modal. Three info items round out minor quality notes.

---

## Warnings

### WR-01: Hover popover rendered inside `pointer-events-none` wrapper — never visible

**File:** `frontend/src/components/ProcessTile.tsx:170-174`

**Issue:** The popover `div` (lines 170–174) is placed as a child of the inner clickable `div`. That inner `div` has no position context (`relative` sits on the outer wrapper at line 100, not on the inner `div`), but more critically the popover is rendered conditionally on `hovered` — which is only set `true` after 250 ms while the mouse is inside the *outer* wrapper. The popover itself carries `pointer-events-none` which is correct, but it is inside the scrolling tile content, meaning `absolute bottom-full` positions it relative to the nearest positioned ancestor: the **outer** `relative` wrapper (line 100). This is actually correct positioning. However the buttons that appear in the footer when `hovered` is true (lines 183–200) are inside the `pointer-events-none`-free inner `div`, so they work. The actual issue: the hover popover `div` at line 170 is placed **inside** the inner `div`, which comes before the footer buttons in the DOM. The popover will be clipped by `overflow: hidden` or obscured by sibling tiles in the horizontal flex row because it appears mid-tile rather than floating above it. `absolute bottom-full` on a child of a non-positioned element falls through to the outer `relative` wrapper — but the outer wrapper is only `relative` on the hover root, not the inner clickable div. Confirm: the inner `div` (line 111) has no `relative` class; the outer `div` (line 100) does. So `bottom-full` should escape the tile correctly. The real risk is z-index stacking: multiple tiles in a row will each have `z-50` popovers; tiles rendered later in the DOM will paint over earlier tiles' popovers since there is no stacking context isolation.

More concretely: the `{hovered && ...popover}` block at line 170 is a sibling of the footer div and inside the scrolling content flow, so on short tiles it may be visually clipped by the parent scroll container (`overflow-y-auto` on the TreeView).

**Fix:** Move the popover outside the inner `div`, as a direct child of the outer `relative` wrapper — after the inner `div` closes and before `{panelOpen && <ClassificationPanel>}`:

```tsx
    </div>  {/* end inner clickable div */}

    {hovered && (
      <div className="absolute bottom-full left-0 mb-1 z-50 pointer-events-none
                      bg-gray-900 border border-gray-700 rounded p-2 shadow-lg
                      max-w-[240px] text-xs text-gray-300 leading-relaxed">
        {node.brief_description ?? node.name}
      </div>
    )}

    {panelOpen && <ClassificationPanel ... />}
  </div>  {/* end outer relative wrapper */}
```

---

### WR-02: Hover timer ref not cleared on component unmount — potential state-update-on-unmounted-component

**File:** `frontend/src/components/ProcessTile.tsx:103-109`

**Issue:** `hoverTimerRef` is cleared in `onMouseLeave` but never cleared in a `useEffect` cleanup. If the component unmounts while the 250 ms timer is pending (e.g. the user filters out the tile mid-hover), the `setTimeout` callback fires and calls `setHovered(true)` on an unmounted component. In React 18 this is a no-op rather than an error, but it is still a latent bug if the ref is later used for other side effects.

**Fix:**

```tsx
useEffect(() => {
  return () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
  }
}, [])
```

---

### WR-03: VG_CHIP duplicate lowercase keys will never match — chips silently absent for some nodes

**File:** `frontend/src/components/ProcessTile.tsx:25-36`

**Issue:** `VG_CHIP` contains duplicate entries for the same vertical group with different capitalisation (e.g., `'Operations Readiness & Support'` and `'operations Readiness & Support'` at lines 29–30; `'Strategy Management'` / `'strategy Management'` lines 31–32; `'Business Value Development'` / `'business Value Development'` lines 33–34). The intent is to tolerate mixed-case data from the Excel parser.

The problem is that `VG_FILTER_CONFIG` in `FilterBar.tsx` (lines 32–40) uses only the title-case keys (e.g. `'Operations Readiness & Support'`). When a user activates a VG filter, `toggleVG` stores the title-case string. In `nodeMatchesFilters` (TreeView line 67), the filter check is `node.vertical_groups.some((vg) => selectedVGs.includes(vg))`. If any node in the Excel has `'operations Readiness & Support'` (lowercase-o), the filter chip renders correctly in FilterBar, but the node will NOT match the filter because `selectedVGs` contains the title-case key and `vertical_groups` contains the lowercase key. The node is silently excluded.

The same mismatch risk applies to `ProcessTile` chip rendering: `VG_CHIP['operations Readiness & Support']` is defined, so the chip renders — but the filter won't match.

**Fix:** Normalise VG strings to a canonical form at one point — either in the parser (backend) or at read time in the frontend. A simple frontend fix is to normalise on comparison:

```ts
// In nodeMatchesFilters (TreeView.tsx line 67)
if (selectedVGs.length > 0) {
  const normalise = (s: string) => s.toLowerCase()
  if (!node.vertical_groups.some((vg) =>
    selectedVGs.some((sel) => normalise(vg) === normalise(sel))
  )) return false
}
```

And remove the duplicate lowercase keys from `VG_CHIP` to keep the map clean.

---

### WR-04: ClassificationPanel modal — Escape key does not close the panel

**File:** `frontend/src/components/ClassificationPanel.tsx:44-156`

**Issue:** The backdrop `onClick={onClose}` (line 47) lets users close the modal by clicking outside, but there is no `keydown` handler for `Escape`. This is the standard expected behaviour for modal dialogs (ARIA modal pattern). Users who open the panel via keyboard navigation or who expect `Escape` to dismiss will find it non-functional.

**Fix:**

```tsx
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }
  document.addEventListener('keydown', handler)
  return () => document.removeEventListener('keydown', handler)
}, [onClose])
```

---

## Info

### IN-01: `hasActive` in FilterBar omits `showDescoped !== 'dim'` — "Clear all" not shown when only descoped mode changed

**File:** `frontend/src/components/FilterBar.tsx:49`

**Issue:** `hasActive` (line 49) is used to decide whether to show the active-chips + "Clear all" section. It checks `categories`, `reviewStatuses`, `selectedTags`, `selectedTeam`, and `selectedVGs`, but does NOT include `showDescoped !== 'dim'`. Compare with `filtersActive` in `TreeView.tsx` line 141, which does include `showDescoped !== 'dim'`. If a user switches descoped mode to `'hide'` or `'show'` (a meaningful filter change), the "Clear all" button does not appear, and `clearAll()` (which resets `showDescoped` back to `'dim'`) is never accessible without manual interaction.

**Fix:**

```ts
const hasActive = categories.length > 0 || reviewStatuses.length > 0 || selectedTags.length > 0
  || selectedTeam !== null || selectedVGs.length > 0 || showDescoped !== 'dim'
```

---

### IN-02: Magic index key for TeamBadge — use stable identifier

**File:** `frontend/src/components/ProcessTile.tsx:163`

**Issue:** `key={i}` (array index) is used for `TeamBadge` elements. If team assignments are reordered or a middle entry is removed, React will produce incorrect reconciliation diffs.

**Fix:** Use a composite stable key:
```tsx
<TeamBadge key={`${t.node_id}-${t.team}-${t.function}`} team={t.team} func={t.function} />
```

---

### IN-03: VG divider in FilterBar always rendered even when VG section is empty

**File:** `frontend/src/components/FilterBar.tsx:123-142`

**Issue:** The VG filter section (lines 123–142) is wrapped in a bare `<>` fragment rather than a conditional, so the `<div>` separator and `VG:` label always render. In contrast, the tag filter section (lines 100–120) is conditionally rendered with `{tagDefs.length > 0 && ...}`. The VG section will always be visible even if no nodes have vertical group data, which adds noise.

This is low severity since VG data is structural (comes from Excel) and always present, but the inconsistency is worth noting for future maintainability.

**Fix:** If VGs are always present this is acceptable as-is. If not, wrap in `{VG_FILTER_CONFIG.length > 0 && ...}` for consistency.

---

_Reviewed: 2026-04-23T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
