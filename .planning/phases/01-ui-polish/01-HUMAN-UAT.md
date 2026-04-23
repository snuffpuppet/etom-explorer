---
status: partial
phase: 01-ui-polish
source: [01-VERIFICATION.md]
started: 2026-04-23T00:00:00.000Z
updated: 2026-04-23T00:00:00.000Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. 250ms hover timing + footer button clickability
expected: Popover appears ~250ms after mouse enters tile (not immediately). While popover is visible, the ⓘ and ✏️ footer buttons remain reachable and clickable.
result: [pending]

### 2. VG chip native tooltip
expected: Hovering over a VG chip shows the full vertical group name (e.g. "Fulfillment", not "FUL") as a native browser tooltip via the `title` attribute.
result: [pending]

### 3. VG filter tree subsetting
expected: Clicking a VG toggle button in the FilterBar causes non-matching tiles to dim (opacity-30, pointer-events-none). An active chip appears in the summary row. Clicking × on the chip removes the filter and restores all tiles.
result: [pending]

### 4. ClassificationPanel centred modal
expected: Clicking ✏️ on a tile near the right viewport edge opens the panel as a centred modal (not clipped). Clicking the backdrop closes the modal.
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
