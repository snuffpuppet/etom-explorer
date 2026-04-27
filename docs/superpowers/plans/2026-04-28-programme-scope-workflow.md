# Programme Scope Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `category`/`descoped` classification model with a `scope_status` field suited to the OSS change programme workflow, add an inline L2 list view for bulk scoping, and fix tag assignment and VG tooltip bugs.

**Architecture:** Backend model and persistence changes migrate existing data automatically at startup. Frontend types, store, hooks, and components are updated in sequence: types first (drives all downstream), then store/hooks, then leaf components (ClassificationPanel, FilterBar, ProcessTile), then container components (TreeView, TileRow, App, DomainTabs), then the new L2ListView.

**Tech Stack:** FastAPI/Python (backend), React 18 + TypeScript + Zustand + React Query + Tailwind CSS (frontend). No test framework — backend verified via `python app/persistence.py`, frontend via `npm run build`.

---

## File Map

### Backend — modified
- `backend/app/models.py` — `ScopeStatusType`, updated `Classification`/`ClassificationUpdate`, remove `DescopedEntry`/`DescopedUpdate`
- `backend/app/persistence.py` — add `migrate_classifications()`, `migrate_descoped()`, `seed_change_stream_tags()`, update `ensure_data_files()`
- `backend/app/main.py` — call migrations + seeding in lifespan; remove descoped router
- `backend/app/routers/classifications.py` — update columns and field names

### Frontend — modified
- `frontend/src/types/classification.ts` — `ScopeStatus` type, new colour/label maps, remove `DescopedEntry`
- `frontend/src/store/filters.ts` — `scopeStatuses`, `setLifecycleArea`, remove `showDescoped`
- `frontend/src/hooks/useClassifications.ts` — updated mutation signature, remove descoped hooks
- `frontend/src/components/ClassificationPanel.tsx` — scope_status radio, reason field, tag assignment, no descope form
- `frontend/src/components/FilterBar.tsx` — scope toggles, lifecycle area, VG tooltips, remove descoped toggle
- `frontend/src/components/TreeView.tsx` — remove `descopedSet`, update filter to `scopeStatuses`, normalise VGs
- `frontend/src/components/TileRow.tsx` — remove `descopedSet`/`showDescoped` props
- `frontend/src/components/ProcessTile.tsx` — `scope_status` border/dot colours, remove `isDescoped`
- `frontend/src/components/ProcessDetail.tsx` — remove `descopedEntry` prop, show `scope_status`/`reason`
- `frontend/src/components/DomainTabs.tsx` — add List tab
- `frontend/src/App.tsx` — remove `useDescoped`, add list view toggle

### Frontend — new
- `frontend/src/components/ScopeDropdown.tsx` — inline scope picker for L2 list rows
- `frontend/src/components/L2ListView.tsx` — L2 flat list with inline scope editing

---

## Task 1: Backend — update models.py

**Files:**
- Modify: `backend/app/models.py`

- [ ] **Step 1: Replace the file**

```python
from pydantic import BaseModel
from typing import Optional, Literal

ScopeStatusType = Literal["tbd", "in_scope", "adjacent", "out_of_scope", "gap"]
ReviewStatusType = Literal["unreviewed", "under_review", "classified"]


class ProcessNode(BaseModel):
    id: str
    name: str
    level: int
    brief_description: Optional[str] = None
    extended_description: Optional[str] = None
    domain: Optional[str] = None
    vertical_groups: list[str] = []
    original_id: Optional[str] = None
    uid: Optional[str] = None
    parent_id: Optional[str] = None
    children: list["ProcessNode"] = []


ProcessNode.model_rebuild()


class Classification(BaseModel):
    id: str
    name: str
    scope_status: ScopeStatusType = "tbd"
    review_status: ReviewStatusType = "unreviewed"
    reason: str = ""
    notes: str = ""


class ClassificationUpdate(BaseModel):
    scope_status: ScopeStatusType
    review_status: ReviewStatusType
    reason: str = ""
    notes: str = ""


# Tags

class TagDef(BaseModel):
    id: str
    name: str
    colour: str = "#6366f1"
    description: str = ""


class TagDefCreate(BaseModel):
    name: str
    colour: str = "#6366f1"
    description: str = ""


class TagAssignment(BaseModel):
    node_id: str
    tag_id: str
    cascade: str = "false"


class TagAssignmentEntry(BaseModel):
    tag_id: str
    cascade: bool = False


class TagAssignmentUpdate(BaseModel):
    assignments: list[TagAssignmentEntry] = []


# Teams

class TeamAssignment(BaseModel):
    node_id: str
    team: str
    function: str = ""


class TeamEntry(BaseModel):
    team: str
    function: str = ""


class TeamAssignmentUpdate(BaseModel):
    assignments: list[TeamEntry] = []


# Search

class SearchResult(BaseModel):
    id: str
    name: str
    level: int
    brief_description: Optional[str] = None
    breadcrumbs: list[str] = []
    ancestor_ids: list[str] = []


# Notes

class NoteResponse(BaseModel):
    id: str
    content: str


class NoteUpdate(BaseModel):
    content: str


# Value Streams

ValueStreamCategoryType = Literal["customer", "operational"]


class ValueStream(BaseModel):
    id: str
    category: ValueStreamCategoryType
    name: str
    process_ids: list[str] = []


class ValueStreamUpdate(BaseModel):
    process_ids: list[str] = []


class ExportRequest(BaseModel):
    format: Literal["markdown", "html"] = "markdown"
```

- [ ] **Step 2: Verify parser still works (models.py is imported by parser)**

```bash
cd backend && python test_parser.py
```
Expected: `✓ All assertions passed` (or similar success output — no errors).

- [ ] **Step 3: Commit**

```bash
git add backend/app/models.py
git commit -m "feat(backend): replace CategoryType with ScopeStatusType, add reason field"
```

---

## Task 2: Backend — migration functions in persistence.py

**Files:**
- Modify: `backend/app/persistence.py`

- [ ] **Step 1: Add migration + seeding functions and update `ensure_data_files`**

After the `_ensure_file` function (line 184) add the following, then update `ensure_data_files` and the self-test block:

```python
# ---------------------------------------------------------------------------
# Migration helpers
# ---------------------------------------------------------------------------

_CATEGORY_MAP: dict[str, str] = {
    "oss": "in_scope",
    "oss_bss": "adjacent",
    "bss": "out_of_scope",
    "other": "tbd",
    "unclassified": "tbd",
}

_CLS_NEW_COLUMNS = ["id", "name", "scope_status", "review_status", "reason", "notes"]


def migrate_classifications() -> None:
    """Migrate classifications.md from category→scope_status schema (v1→v2).
    No-op if already migrated or file is empty.
    """
    fm, body = read_md_file("classifications.md")
    if fm.get("version", 1) >= 2:
        return
    rows = parse_md_table(body, "Classifications")
    if not rows:
        write_md_file("classifications.md", {"version": 2},
                      "## Classifications\n\n" + write_md_table([], _CLS_NEW_COLUMNS))
        return
    if "category" not in rows[0]:
        return  # Already in new format despite version

    migrated = [
        {
            "id": r.get("id", ""),
            "name": r.get("name", ""),
            "scope_status": _CATEGORY_MAP.get(r.get("category", "unclassified"), "tbd"),
            "review_status": r.get("review_status", "unreviewed"),
            "reason": "",
            "notes": r.get("notes", ""),
        }
        for r in rows
    ]
    body_new = "## Classifications\n\n" + write_md_table(migrated, _CLS_NEW_COLUMNS)
    write_md_file("classifications.md", {"version": 2}, body_new)


def migrate_descoped() -> None:
    """Merge descoped.md rows into classifications.md as out_of_scope.
    Idempotent: re-running overwrites scope_status/reason for the same IDs.
    No-op if descoped.md has no rows.
    """
    _, desc_body = read_md_file("descoped.md")
    desc_rows = parse_md_table(desc_body, "Descoped")
    if not desc_rows:
        return

    _, cls_body = read_md_file("classifications.md")
    cls_rows = parse_md_table(cls_body, "Classifications")
    cls_by_id: dict[str, dict] = {r["id"]: dict(r) for r in cls_rows}

    for d in desc_rows:
        node_id = d.get("id", "")
        if not node_id:
            continue
        reason = d.get("reason", "")
        notes = d.get("notes", "")
        if node_id in cls_by_id:
            existing_notes = cls_by_id[node_id].get("notes", "")
            combined = (existing_notes + "\n" + notes).strip() if notes else existing_notes
            cls_by_id[node_id].update({"scope_status": "out_of_scope", "reason": reason, "notes": combined})
        else:
            cls_by_id[node_id] = {
                "id": node_id,
                "name": d.get("name", ""),
                "scope_status": "out_of_scope",
                "review_status": "unreviewed",
                "reason": reason,
                "notes": notes,
            }

    body_new = "## Classifications\n\n" + write_md_table(list(cls_by_id.values()), _CLS_NEW_COLUMNS)
    write_md_file("classifications.md", {"version": 2}, body_new)


_CHANGE_STREAM_TAGS = [
    {"name": "service-inventory", "colour": "#3b82f6", "description": ""},
    {"name": "service-catalog",   "colour": "#6366f1", "description": ""},
    {"name": "resource-mgmt",     "colour": "#10b981", "description": ""},
    {"name": "norc-fulfilment",   "colour": "#f59e0b", "description": ""},
    {"name": "new-integrations",  "colour": "#8b5cf6", "description": ""},
    {"name": "new-platform",      "colour": "#ec4899", "description": ""},
    {"name": "delivery-pipeline", "colour": "#14b8a6", "description": ""},
]


def seed_change_stream_tags() -> None:
    """Idempotently add change stream tag definitions if not already present."""
    import re
    _, body = read_md_file("tags.md")
    rows = parse_md_table(body, "Tags")
    existing_names = {r["name"].lower() for r in rows}
    added = False
    for tag in _CHANGE_STREAM_TAGS:
        if tag["name"].lower() in existing_names:
            continue
        tag_id = re.sub(r"[^a-z0-9]+", "-", tag["name"].lower()).strip("-")
        rows.append({"id": tag_id, "name": tag["name"], "colour": tag["colour"], "description": tag["description"]})
        added = True
    if added:
        body_new = "## Tags\n\n" + write_md_table(rows, ["id", "name", "colour", "description"])
        write_md_file("tags.md", {"version": 1}, body_new)
```

- [ ] **Step 2: Update `ensure_data_files` to use new schema**

Replace the `classifications.md` block inside `ensure_data_files`:

```python
    _ensure_file(
        "classifications.md",
        frontmatter={"version": 2},
        body="## Classifications\n\n" + write_md_table([], _CLS_NEW_COLUMNS)
    )
```

- [ ] **Step 3: Update the self-test block at the bottom of persistence.py**

Replace the existing `if __name__ == "__main__":` block:

```python
if __name__ == "__main__":
    import tempfile
    os.environ["DATA_DIR"] = tempfile.mkdtemp()

    ensure_data_files()

    # --- Basic read/write roundtrip ---
    fm, body = read_md_file("classifications.md")
    assert fm["version"] == 2, f"Expected version 2, got {fm.get('version')}"
    rows = parse_md_table(body, "Classifications")
    assert rows == [], f"Expected [], got {rows}"

    row = {"id": "1.1.1", "name": "Test", "scope_status": "in_scope",
           "review_status": "unreviewed", "reason": "direct impact", "notes": ""}
    table_str = write_md_table([row], _CLS_NEW_COLUMNS)
    write_md_file("classifications.md", {"version": 2}, "## Classifications\n\n" + table_str)
    fm2, body2 = read_md_file("classifications.md")
    rows2 = parse_md_table(body2, "Classifications")
    assert len(rows2) == 1 and rows2[0]["scope_status"] == "in_scope", f"Got: {rows2}"
    print("✅ roundtrip: PASS")

    # --- migrate_classifications: v1 (category) → v2 (scope_status) ---
    old_row = {"id": "1.2.3", "name": "Old", "category": "oss_bss",
               "review_status": "classified", "notes": "existing note"}
    old_table = write_md_table([old_row], ["id", "name", "category", "review_status", "notes"])
    write_md_file("classifications.md", {"version": 1}, "## Classifications\n\n" + old_table)
    migrate_classifications()
    _, body3 = read_md_file("classifications.md")
    rows3 = parse_md_table(body3, "Classifications")
    assert rows3[0]["scope_status"] == "adjacent", f"Expected adjacent, got {rows3[0]}"
    assert rows3[0]["notes"] == "existing note", f"Notes not preserved: {rows3[0]}"
    print("✅ migrate_classifications: PASS")

    # --- migrate_descoped: merges descoped.md into classifications.md ---
    desc_row = {"id": "1.2.3", "name": "Old", "reason": "BSS only", "notes": ""}
    desc_table = write_md_table([desc_row], ["id", "name", "reason", "notes"])
    write_md_file("descoped.md", {"version": 1}, "## Descoped\n\n" + desc_table)
    migrate_descoped()
    _, body4 = read_md_file("classifications.md")
    rows4 = parse_md_table(body4, "Classifications")
    r = next(r for r in rows4 if r["id"] == "1.2.3")
    assert r["scope_status"] == "out_of_scope", f"Expected out_of_scope, got {r}"
    assert r["reason"] == "BSS only", f"Expected reason, got {r}"
    print("✅ migrate_descoped: PASS")

    # --- seed_change_stream_tags: idempotent seeding ---
    seed_change_stream_tags()
    _, tbody = read_md_file("tags.md")
    tag_rows = parse_md_table(tbody, "Tags")
    names = {r["name"] for r in tag_rows}
    assert "service-inventory" in names, f"Missing tag: {names}"
    assert "norc-fulfilment" in names, f"Missing tag: {names}"
    seed_change_stream_tags()  # second call should not duplicate
    _, tbody2 = read_md_file("tags.md")
    tag_rows2 = parse_md_table(tbody2, "Tags")
    assert len(tag_rows2) == len(tag_rows), "Seeding is not idempotent"
    print("✅ seed_change_stream_tags: PASS")

    print("✅ persistence.py self-test passed")
```

- [ ] **Step 4: Run the self-test**

```bash
cd backend && python app/persistence.py
```
Expected output (all four lines):
```
✅ roundtrip: PASS
✅ migrate_classifications: PASS
✅ migrate_descoped: PASS
✅ seed_change_stream_tags: PASS
✅ persistence.py self-test passed
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/persistence.py
git commit -m "feat(backend): add classification migration, descoped merge, and tag seeding"
```

---

## Task 3: Backend — update main.py

**Files:**
- Modify: `backend/app/main.py`

- [ ] **Step 1: Update lifespan and router imports**

Replace the entire file:

```python
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.parser import parse_excel
from app.persistence import ensure_data_files, migrate_classifications, migrate_descoped, seed_change_stream_tags

EXCEL_PATH = os.getenv(
    "EXCEL_PATH",
    "/app/data_source/GB921_Business_Process_Framework_Processes_Excel_v25.5.xlsx",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.process_tree = parse_excel(EXCEL_PATH)
    ensure_data_files()
    migrate_classifications()
    migrate_descoped()
    seed_change_stream_tags()
    app.state.seed_status = "idle"
    app.state.seed_result = None
    yield


app = FastAPI(title="eTOM Explorer API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.routers import processes, classifications, tags, teams, search, chat, llm, notes, value_streams, export  # noqa: E402

app.include_router(processes.router, prefix="/api")
app.include_router(classifications.router, prefix="/api")
app.include_router(tags.router, prefix="/api")
app.include_router(teams.router, prefix="/api")
app.include_router(search.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(llm.router, prefix="/api")
app.include_router(notes.router, prefix="/api")
app.include_router(value_streams.router, prefix="/api")
app.include_router(export.router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok"}
```

- [ ] **Step 2: Verify import chain is clean**

```bash
cd backend && python -c "from app.main import app; print('OK')"
```
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add backend/app/main.py
git commit -m "feat(backend): run migrations and tag seeding at startup; remove descoped router"
```

---

## Task 4: Backend — update classifications router

**Files:**
- Modify: `backend/app/routers/classifications.py`

- [ ] **Step 1: Replace the file**

```python
from fastapi import APIRouter, Request, HTTPException
from urllib.parse import unquote
from app.models import Classification, ClassificationUpdate
from app.persistence import read_md_file, write_md_file, parse_md_table, write_md_table
from app.utils import find_node

router = APIRouter()

FILENAME = "classifications.md"
SECTION = "Classifications"
COLUMNS = ["id", "name", "scope_status", "review_status", "reason", "notes"]


@router.get("/classifications", response_model=list[Classification])
async def get_classifications(request: Request):
    _, body = read_md_file(FILENAME)
    rows = parse_md_table(body, SECTION)
    return [Classification(**row) for row in rows]


@router.put("/classifications/{node_id:path}", response_model=Classification)
async def update_classification(node_id: str, update: ClassificationUpdate, request: Request):
    node_id = unquote(node_id)

    tree = request.app.state.process_tree
    node = find_node(tree, node_id)
    if node is None:
        raise HTTPException(status_code=404, detail=f"Process node '{node_id}' not found")

    _, body = read_md_file(FILENAME)
    rows = parse_md_table(body, SECTION)

    new_row = {
        "id": node_id,
        "name": node.name,
        "scope_status": update.scope_status,
        "review_status": update.review_status,
        "reason": update.reason,
        "notes": update.notes,
    }
    existing = next((r for r in rows if r["id"] == node_id), None)
    if existing:
        rows = [new_row if r["id"] == node_id else r for r in rows]
    else:
        rows.append(new_row)

    body_new = f"## {SECTION}\n\n" + write_md_table(rows, COLUMNS)
    write_md_file(FILENAME, {"version": 2}, body_new)
    return Classification(**new_row)
```

- [ ] **Step 2: Smoke-test the backend starts cleanly**

```bash
cd backend
EXCEL_PATH=../docs/GB921_Business_Process_Framework_Processes_Excel_v25.5.xlsx \
  DATA_DIR=/tmp/etom-test-data \
  python -c "
import asyncio
from app.main import app, lifespan
# Just verify imports resolve
print('Backend imports OK')
"
```
Expected: `Backend imports OK`

- [ ] **Step 3: Commit**

```bash
git add backend/app/routers/classifications.py
git commit -m "feat(backend): update classifications router for scope_status and reason fields"
```

---

## Task 5: Frontend — update classification types

**Files:**
- Modify: `frontend/src/types/classification.ts`

- [ ] **Step 1: Replace the file**

```typescript
export type ScopeStatus = 'tbd' | 'in_scope' | 'adjacent' | 'out_of_scope' | 'gap'
export type ReviewStatus = 'unreviewed' | 'under_review' | 'classified'

export interface Classification {
  id: string
  name: string
  scope_status: ScopeStatus
  review_status: ReviewStatus
  reason: string
  notes: string
}

export const SCOPE_STATUS_BORDER: Record<ScopeStatus, string> = {
  tbd:          'border-gray-600',
  in_scope:     'border-green-500',
  adjacent:     'border-blue-500',
  out_of_scope: 'border-red-500',
  gap:          'border-amber-500',
}

export const SCOPE_STATUS_DOT: Record<ScopeStatus, string> = {
  tbd:          'bg-gray-600',
  in_scope:     'bg-green-500',
  adjacent:     'bg-blue-500',
  out_of_scope: 'bg-red-500',
  gap:          'bg-amber-500',
}

export const SCOPE_STATUS_LABELS: Record<ScopeStatus, string> = {
  tbd:          'TBD',
  in_scope:     'In Scope',
  adjacent:     'Adjacent',
  out_of_scope: 'Out of Scope',
  gap:          'Gap',
}

export const SCOPE_STATUS_BG: Record<ScopeStatus, string> = {
  tbd:          'bg-gray-600',
  in_scope:     'bg-green-600',
  adjacent:     'bg-blue-600',
  out_of_scope: 'bg-red-600',
  gap:          'bg-amber-600',
}

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  unreviewed:   'Unreviewed',
  under_review: 'Under Review',
  classified:   'Classified',
}

export const SCOPE_STATUSES: ScopeStatus[] = ['tbd', 'in_scope', 'adjacent', 'out_of_scope', 'gap']
export const REVIEW_STATUSES: ReviewStatus[] = ['unreviewed', 'under_review', 'classified']
```

- [ ] **Step 2: Run build to find all type breakages**

```bash
cd frontend && npm run build 2>&1 | head -60
```
Expected: Multiple TypeScript errors pointing to files that still reference `Category`, `DescopedEntry`, `CATEGORY_COLOURS`, etc. This is expected — we'll fix them in subsequent tasks.

- [ ] **Step 3: Commit types**

```bash
git add frontend/src/types/classification.ts
git commit -m "feat(frontend): replace Category with ScopeStatus type"
```

---

## Task 6: Frontend — update filter store

**Files:**
- Modify: `frontend/src/store/filters.ts`

- [ ] **Step 1: Replace the file**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/store/filters.ts
git commit -m "feat(frontend): update filter store — scopeStatuses, lifecycleArea toggle, remove showDescoped"
```

---

## Task 7: Frontend — update useClassifications hook

**Files:**
- Modify: `frontend/src/hooks/useClassifications.ts`

- [ ] **Step 1: Replace the file**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../api/client'
import type { Classification } from '../types/classification'

export function useClassifications() {
  return useQuery({
    queryKey: ['classifications'],
    queryFn: () => apiFetch<Classification[]>('/classifications'),
    staleTime: 0,
  })
}

export function useUpdateClassification() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      scope_status,
      review_status,
      reason,
      notes,
    }: {
      id: string
      scope_status: string
      review_status: string
      reason: string
      notes: string
    }) =>
      apiFetch<Classification>(`/classifications/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope_status, review_status, reason, notes }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['classifications'] }),
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/hooks/useClassifications.ts
git commit -m "feat(frontend): update useClassifications hook for scope_status/reason; remove descoped hooks"
```

---

## Task 8: Frontend — update ClassificationPanel

**Files:**
- Modify: `frontend/src/components/ClassificationPanel.tsx`

- [ ] **Step 1: Replace the file**

```typescript
import { useState } from 'react'
import type { ProcessNode } from '../types/process'
import type { Classification, ScopeStatus, ReviewStatus } from '../types/classification'
import { SCOPE_STATUS_LABELS, SCOPE_STATUS_DOT, SCOPE_STATUS_BORDER, SCOPE_STATUSES, REVIEW_STATUS_LABELS, REVIEW_STATUSES, SCOPE_STATUS_BG } from '../types/classification'
import { useUpdateClassification } from '../hooks/useClassifications'
import { useTags, useTagAssignments, useUpdateNodeTags } from '../hooks/useTags'

interface ClassificationPanelProps {
  node: ProcessNode
  classification: Classification | null
  onClose: () => void
}

export function ClassificationPanel({ node, classification, onClose }: ClassificationPanelProps) {
  const [scopeStatus, setScopeStatus] = useState<ScopeStatus>(classification?.scope_status ?? 'tbd')
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus>(classification?.review_status ?? 'unreviewed')
  const [reason, setReason] = useState(classification?.reason ?? '')
  const [notes, setNotes] = useState(classification?.notes ?? '')

  const { data: tagDefs = [] } = useTags()
  const { data: allAssignments = [] } = useTagAssignments()
  const nodeAssignments = allAssignments.filter((a) => a.node_id === node.id)
  const [selectedTags, setSelectedTags] = useState<{ tag_id: string; cascade: boolean }[]>(
    nodeAssignments.map((a) => ({ tag_id: a.tag_id, cascade: a.cascade === 'true' }))
  )

  const updateClassification = useUpdateClassification()
  const updateNodeTags = useUpdateNodeTags()

  const handleSave = () => {
    updateClassification.mutate({ id: node.id, scope_status: scopeStatus, review_status: reviewStatus, reason, notes })
    updateNodeTags.mutate({ nodeId: node.id, assignments: selectedTags })
    onClose()
  }

  function toggleTag(tagId: string) {
    setSelectedTags((prev) => {
      const exists = prev.find((t) => t.tag_id === tagId)
      return exists ? prev.filter((t) => t.tag_id !== tagId) : [...prev, { tag_id: tagId, cascade: false }]
    })
  }

  function toggleCascade(tagId: string) {
    setSelectedTags((prev) =>
      prev.map((t) => t.tag_id === tagId ? { ...t, cascade: !t.cascade } : t)
    )
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
        <div className="pointer-events-auto bg-gray-800 border border-gray-700 rounded-lg w-[480px] max-h-[90vh] overflow-y-auto shadow-2xl p-6">
          <h3 className="text-sm font-semibold text-white mb-4 truncate">{node.name}</h3>

          {/* Scope status */}
          <div className="mb-4">
            <p className="text-xs text-gray-400 mb-1.5 uppercase tracking-wide">Scope</p>
            <div className="space-y-1">
              {SCOPE_STATUSES.map((s) => (
                <label key={s} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="scope_status"
                    value={s}
                    checked={scopeStatus === s}
                    onChange={() => setScopeStatus(s)}
                    className="sr-only"
                  />
                  <span className={`inline-block w-3 h-3 rounded-full flex-shrink-0 ${SCOPE_STATUS_DOT[s]} ${scopeStatus === s ? 'ring-2 ring-white ring-offset-1 ring-offset-gray-800' : ''}`} />
                  <span className={`text-sm ${scopeStatus === s ? 'text-white' : 'text-gray-400'}`}>
                    {SCOPE_STATUS_LABELS[s]}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Reason */}
          <div className="mb-4">
            <p className="text-xs text-gray-400 mb-1.5 uppercase tracking-wide">Reason <span className="normal-case text-gray-600">(optional)</span></p>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why this scope decision…"
              className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Review status */}
          <div className="mb-4">
            <p className="text-xs text-gray-400 mb-1.5 uppercase tracking-wide">Review Status</p>
            <select
              value={reviewStatus}
              onChange={(e) => setReviewStatus(e.target.value as ReviewStatus)}
              className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              {REVIEW_STATUSES.map((rs) => (
                <option key={rs} value={rs}>{REVIEW_STATUS_LABELS[rs]}</option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div className="mb-4">
            <p className="text-xs text-gray-400 mb-1.5 uppercase tracking-wide">Notes</p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500 resize-none"
              placeholder="Optional notes…"
            />
          </div>

          <hr className="border-gray-700 my-4" />

          {/* Tags */}
          {tagDefs.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-gray-400 mb-1.5 uppercase tracking-wide">Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {tagDefs.map((tag) => {
                  const selected = selectedTags.find((t) => t.tag_id === tag.id)
                  const cascade = selected?.cascade ?? false
                  return (
                    <div key={tag.id} className="flex items-center gap-1">
                      <button
                        onClick={() => toggleTag(tag.id)}
                        className="text-xs px-2 py-0.5 rounded border transition-colors"
                        style={{
                          borderColor: tag.colour,
                          color: selected ? 'white' : tag.colour + 'cc',
                          backgroundColor: selected ? tag.colour + '33' : undefined,
                        }}
                      >
                        {tag.name}
                      </button>
                      {selected && (
                        <button
                          onClick={() => toggleCascade(tag.id)}
                          className={`text-xs px-1 py-0.5 rounded border ${cascade ? 'border-gray-400 text-gray-300' : 'border-gray-700 text-gray-600'}`}
                          title="Cascade to children"
                        >
                          ↓
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={updateClassification.isPending}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs py-1.5 rounded transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </>
  )
}

// Re-export for ProcessTile (border colour lookup)
export { SCOPE_STATUS_BORDER as CLASSIFICATION_BORDER_COLOURS }
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/ClassificationPanel.tsx
git commit -m "feat(frontend): rewrite ClassificationPanel with scope_status, reason, and inline tag assignment"
```

---

## Task 9: Frontend — update FilterBar

**Files:**
- Modify: `frontend/src/components/FilterBar.tsx`

- [ ] **Step 1: Replace the file**

```typescript
import { useFilterStore, S2R_VGS, OPS_VGS } from '../store/filters'
import type { ScopeStatus, ReviewStatus } from '../types/classification'
import { SCOPE_STATUS_LABELS, SCOPE_STATUS_BG, REVIEW_STATUS_LABELS, SCOPE_STATUSES, REVIEW_STATUSES } from '../types/classification'
import { useTags, useTeams } from '../hooks/useTags'

const SCOPE_INACTIVE: Record<ScopeStatus, string> = {
  tbd:          'border-gray-600 text-gray-500 hover:bg-gray-800',
  in_scope:     'border-green-600 text-green-400 hover:bg-green-900/30',
  adjacent:     'border-blue-600 text-blue-400 hover:bg-blue-900/30',
  out_of_scope: 'border-red-600 text-red-400 hover:bg-red-900/30',
  gap:          'border-amber-600 text-amber-400 hover:bg-amber-900/30',
}

const VG_FILTER_CONFIG: Array<{ vg: string; abbr: string; bg: string; text: string }> = [
  { vg: 'Fulfillment',                    abbr: 'FUL', bg: '#1e3a5f', text: '#93c5fd' },
  { vg: 'Assurance',                      abbr: 'ASR', bg: '#451a03', text: '#fcd34d' },
  { vg: 'Billing',                        abbr: 'BIL', bg: '#14532d', text: '#6ee7b7' },
  { vg: 'Operations Readiness & Support', abbr: 'ORS', bg: '#334155', text: '#cbd5e1' },
  { vg: 'Strategy Management',            abbr: 'SMT', bg: '#3b0764', text: '#d8b4fe' },
  { vg: 'Business Value Development',     abbr: 'BVD', bg: '#4a044e', text: '#f0abfc' },
  { vg: 'Capability Management',          abbr: 'CAP', bg: '#042f2e', text: '#5eead4' },
]

export function FilterBar() {
  const {
    scopeStatuses, reviewStatuses, selectedTags, selectedTeam, selectedVGs,
    toggleScopeStatus, toggleReviewStatus, toggleTag, setTeam, toggleVG, toggleLifecycleArea, clearAll,
  } = useFilterStore()
  const { data: tagDefs = [] } = useTags()
  const { data: allTeams = [] } = useTeams()
  const teamNames = [...new Set(allTeams.map((t) => t.team))].sort()

  const s2rActive = S2R_VGS.every(vg => selectedVGs.includes(vg))
  const opsActive = OPS_VGS.every(vg => selectedVGs.includes(vg))

  const hasActive = scopeStatuses.length > 0 || reviewStatuses.length > 0 || selectedTags.length > 0 || selectedTeam !== null || selectedVGs.length > 0

  return (
    <div className="bg-gray-900 border-b border-gray-700 px-5 py-2 flex items-center gap-3 flex-wrap">

      {/* Scope status toggles */}
      {SCOPE_STATUSES.map((s) => {
        const active = scopeStatuses.includes(s)
        return (
          <button
            key={s}
            onClick={() => toggleScopeStatus(s)}
            className={`text-xs px-2.5 py-1 rounded border transition-colors ${active ? SCOPE_STATUS_BG[s] + ' text-white border-transparent' : SCOPE_INACTIVE[s]}`}
          >
            {SCOPE_STATUS_LABELS[s]}
          </button>
        )
      })}

      <div className="w-px h-5 bg-gray-700 mx-1" />

      {/* Review status toggles */}
      {REVIEW_STATUSES.map((rs) => {
        const active = reviewStatuses.includes(rs)
        return (
          <button
            key={rs}
            onClick={() => toggleReviewStatus(rs)}
            className={`text-xs px-2.5 py-1 rounded border transition-colors ${active ? 'bg-gray-500 text-white border-gray-500' : 'border-gray-600 text-gray-400 hover:bg-gray-800'}`}
          >
            {REVIEW_STATUS_LABELS[rs]}
          </button>
        )
      })}

      <div className="w-px h-5 bg-gray-700 mx-1" />

      {/* Tag filters */}
      {tagDefs.length > 0 && (
        <>
          {tagDefs.map((tag) => {
            const active = selectedTags.includes(tag.id)
            return (
              <button
                key={tag.id}
                onClick={() => toggleTag(tag.id)}
                className="text-xs px-2.5 py-1 rounded border transition-colors"
                style={active
                  ? { backgroundColor: tag.colour, borderColor: tag.colour, color: 'white' }
                  : { borderColor: tag.colour + '88', color: tag.colour + 'cc' }
                }
              >
                {tag.name}
              </button>
            )
          })}
          <div className="w-px h-5 bg-gray-700 mx-1" />
        </>
      )}

      {/* Lifecycle area toggles (S2R / OPS) */}
      <span className="text-xs text-gray-500">Lifecycle:</span>
      <button
        onClick={() => toggleLifecycleArea('S2R')}
        className={`text-xs px-2 py-1 rounded border transition-colors ${s2rActive ? 'bg-purple-700 text-white border-purple-700' : 'border-purple-800 text-purple-400 hover:bg-purple-900/30'}`}
        title="Strategy-to-Readiness: Strategy Management, Capability Management, Business Value Development"
      >
        S2R
      </button>
      <button
        onClick={() => toggleLifecycleArea('OPS')}
        className={`text-xs px-2 py-1 rounded border transition-colors ${opsActive ? 'bg-cyan-700 text-white border-cyan-700' : 'border-cyan-800 text-cyan-400 hover:bg-cyan-900/30'}`}
        title="Operations: Operations Readiness & Support, Fulfillment, Assurance, Billing"
      >
        OPS
      </button>

      {/* VG fine-grain toggles */}
      <span className="text-xs text-gray-500 ml-1">VG:</span>
      {VG_FILTER_CONFIG.map(({ vg, abbr, bg, text }) => {
        const active = selectedVGs.includes(vg)
        return (
          <button
            key={vg}
            onClick={() => toggleVG(vg)}
            title={vg}
            className="text-xs px-2 py-1 rounded border transition-colors"
            style={active
              ? { backgroundColor: bg, borderColor: bg, color: text }
              : { borderColor: text + '88', color: text + 'cc' }
            }
          >
            {abbr}
          </button>
        )
      })}

      {/* Team filter */}
      {teamNames.length > 0 && (
        <>
          <div className="w-px h-5 bg-gray-700 mx-1" />
          <select
            value={selectedTeam ?? ''}
            onChange={(e) => setTeam(e.target.value || null)}
            className="text-xs bg-gray-800 text-gray-300 border border-gray-700 rounded px-2 py-1 focus:outline-none"
          >
            <option value="">All teams</option>
            {teamNames.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </>
      )}

      {/* Active filter chips + clear */}
      {hasActive && (
        <>
          <div className="w-px h-5 bg-gray-700 mx-1" />
          <div className="flex items-center gap-1.5 flex-wrap">
            {scopeStatuses.map((s) => (
              <span key={s} onClick={() => toggleScopeStatus(s)}
                className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded cursor-pointer hover:bg-gray-600 flex items-center gap-1">
                {SCOPE_STATUS_LABELS[s]} <span className="text-gray-500">×</span>
              </span>
            ))}
            {reviewStatuses.map((rs) => (
              <span key={rs} onClick={() => toggleReviewStatus(rs)}
                className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded cursor-pointer hover:bg-gray-600 flex items-center gap-1">
                {REVIEW_STATUS_LABELS[rs]} <span className="text-gray-500">×</span>
              </span>
            ))}
            {selectedTags.map((tagId) => {
              const def = tagDefs.find((t) => t.id === tagId)
              return def ? (
                <span key={tagId} onClick={() => toggleTag(tagId)}
                  className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded cursor-pointer hover:bg-gray-600 flex items-center gap-1">
                  {def.name} <span className="text-gray-500">×</span>
                </span>
              ) : null
            })}
            {selectedTeam && (
              <span onClick={() => setTeam(null)}
                className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded cursor-pointer hover:bg-gray-600 flex items-center gap-1">
                {selectedTeam} <span className="text-gray-500">×</span>
              </span>
            )}
            {selectedVGs.map((vg) => {
              const cfg = VG_FILTER_CONFIG.find((c) => c.vg === vg)
              return (
                <span key={vg} onClick={() => toggleVG(vg)}
                  className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded cursor-pointer hover:bg-gray-600 flex items-center gap-1">
                  {cfg ? cfg.abbr : vg} <span className="text-gray-500">×</span>
                </span>
              )
            })}
            <button onClick={clearAll} className="text-xs text-gray-500 hover:text-gray-300 underline ml-1">
              Clear all
            </button>
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/FilterBar.tsx
git commit -m "feat(frontend): update FilterBar with scope_status toggles, S2R/OPS lifecycle toggle, VG tooltips"
```

---

## Task 10: Frontend — update TreeView and TileRow

**Files:**
- Modify: `frontend/src/components/TreeView.tsx`
- Modify: `frontend/src/components/TileRow.tsx`

- [ ] **Step 1: Replace TreeView.tsx**

```typescript
import { useMemo } from 'react'
import { ProcessNode } from '../types/process'
import type { Classification, ScopeStatus, ReviewStatus } from '../types/classification'
import { useNavigationStore } from '../store/navigation'
import { useFilterStore } from '../store/filters'
import { useClassifications } from '../hooks/useClassifications'
import { useTags, useTagAssignments, useTeams } from '../hooks/useTags'
import { TileRow } from './TileRow'

interface TreeViewProps {
  domain: ProcessNode
}

function buildNodeMap(nodes: ProcessNode[]): Map<string, ProcessNode> {
  const map = new Map<string, ProcessNode>()
  for (const node of nodes) {
    map.set(node.id, node)
    if (node.children.length > 0) {
      buildNodeMap(node.children).forEach((v, k) => map.set(k, v))
    }
  }
  return map
}

type Visibility = 'visible' | 'muted' | 'hidden'

function normalizeVG(vg: string): string {
  return vg.trim().toLowerCase()
}

interface FilterParams {
  classificationsMap: Map<string, Classification>
  scopeStatuses: ScopeStatus[]
  reviewStatuses: ReviewStatus[]
  selectedTags: string[]
  tagAssignmentMap: Map<string, string[]>
  selectedTeam: string | null
  teamAssignmentMap: Map<string, string[]>
  selectedVGs: string[]
}

function nodeMatchesFilters(node: ProcessNode, fp: FilterParams): boolean {
  const cls = fp.classificationsMap.get(node.id)

  if (fp.scopeStatuses.length > 0) {
    const ss = cls?.scope_status ?? 'tbd'
    if (!fp.scopeStatuses.includes(ss)) return false
  }

  if (fp.reviewStatuses.length > 0) {
    const rs = cls?.review_status ?? 'unreviewed'
    if (!fp.reviewStatuses.includes(rs)) return false
  }

  if (fp.selectedTags.length > 0) {
    const nodeTags = fp.tagAssignmentMap.get(node.id) ?? []
    if (!fp.selectedTags.some((t) => nodeTags.includes(t))) return false
  }

  if (fp.selectedTeam !== null) {
    const nodeTeams = fp.teamAssignmentMap.get(node.id) ?? []
    if (!nodeTeams.includes(fp.selectedTeam)) return false
  }

  if (fp.selectedVGs.length > 0) {
    const normalizedSelected = fp.selectedVGs.map(normalizeVG)
    if (!node.vertical_groups.some(vg => normalizedSelected.includes(normalizeVG(vg)))) return false
  }

  return true
}

function hasMatchingDescendant(node: ProcessNode, fp: FilterParams): boolean {
  for (const child of node.children) {
    if (nodeMatchesFilters(child, fp)) return true
    if (hasMatchingDescendant(child, fp)) return true
  }
  return false
}

function getVisibility(node: ProcessNode, fp: FilterParams, filtersActive: boolean): Visibility {
  if (!filtersActive) return 'visible'
  if (nodeMatchesFilters(node, fp)) return 'visible'
  if (hasMatchingDescendant(node, fp)) return 'muted'
  return 'hidden'
}

export function TreeView({ domain }: TreeViewProps) {
  const { drillPath, selectNode } = useNavigationStore()
  const { scopeStatuses, reviewStatuses, selectedTags, selectedTeam, selectedVGs } = useFilterStore()
  const { data: classifications } = useClassifications()
  const { data: tagDefs = [] } = useTags()
  const { data: tagAssignments = [] } = useTagAssignments()
  const { data: teamAssignments = [] } = useTeams()

  const nodeMap = useMemo(() => buildNodeMap(domain.children), [domain])

  const classificationsMap = useMemo(() => {
    const map = new Map<string, Classification>()
    for (const c of classifications ?? []) map.set(c.id, c)
    return map
  }, [classifications])

  const tagAssignmentMap = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const a of tagAssignments) {
      map.set(a.node_id, [...(map.get(a.node_id) ?? []), a.tag_id])
    }
    return map
  }, [tagAssignments])

  const teamAssignmentMap = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const t of teamAssignments) {
      map.set(t.node_id, [...(map.get(t.node_id) ?? []), t.team])
    }
    return map
  }, [teamAssignments])

  const filtersActive = scopeStatuses.length > 0 || reviewStatuses.length > 0 || selectedTags.length > 0 || selectedTeam !== null || selectedVGs.length > 0

  const fp: FilterParams = { classificationsMap, scopeStatuses, reviewStatuses, selectedTags, tagAssignmentMap, selectedTeam, teamAssignmentMap, selectedVGs }

  const rows: { nodes: ProcessNode[]; depth: number }[] = []
  if (domain.children.length > 0) rows.push({ nodes: domain.children, depth: 0 })
  for (let i = 0; i < drillPath.length; i++) {
    const selectedNode = nodeMap.get(drillPath[i])
    if (!selectedNode || selectedNode.children.length === 0) break
    rows.push({ nodes: selectedNode.children, depth: i + 1 })
  }

  return (
    <div className="flex-1 overflow-y-auto px-5 py-4 bg-gray-950 flex flex-col gap-6">
      {rows.map(({ nodes, depth }) => {
        const selectedId = drillPath[depth] ?? null
        const parentNode = depth === 0 ? null : nodeMap.get(drillPath[depth - 1])
        const levelNum = nodes[0]?.level ?? depth + 2
        const label = depth === 0 ? `Level ${levelNum}` : `Level ${levelNum} — ${parentNode?.name ?? ''}`
        return (
          <TileRow
            key={depth}
            nodes={nodes}
            selectedId={selectedId}
            onSelect={(node) => selectNode(node.id, depth + 1)}
            level={depth + 1}
            label={label}
            classificationsMap={classificationsMap}
            getVisibility={(node) => getVisibility(node, fp, filtersActive)}
            tagDefs={tagDefs}
            tagAssignments={tagAssignments}
            teamAssignments={teamAssignments}
          />
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Replace TileRow.tsx**

```typescript
import { ProcessNode } from '../types/process'
import type { Classification } from '../types/classification'
import type { TagDef, TagAssignment, TeamAssignment } from '../types/tags'
import { ProcessTile } from './ProcessTile'

type Visibility = 'visible' | 'muted' | 'hidden'

interface TileRowProps {
  nodes: ProcessNode[]
  selectedId: string | null
  onSelect: (node: ProcessNode) => void
  level: number
  label: string
  classificationsMap: Map<string, Classification>
  getVisibility: (node: ProcessNode) => Visibility
  tagDefs?: TagDef[]
  tagAssignments?: TagAssignment[]
  teamAssignments?: TeamAssignment[]
}

export function TileRow({ nodes, selectedId, onSelect, level, label, classificationsMap, getVisibility, tagDefs, tagAssignments, teamAssignments }: TileRowProps) {
  const hasSiblingSelected = selectedId !== null

  return (
    <div>
      {level > 1 && <div className="w-0.5 h-4 bg-blue-400/50 ml-8 mb-1" />}
      <p className="text-xs uppercase tracking-widest text-gray-500 mb-2">{label}</p>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
        {nodes.map((node) => {
          const vis = getVisibility(node)
          if (vis === 'hidden') return null
          return (
            <ProcessTile
              key={node.id}
              node={node}
              isSelected={node.id === selectedId}
              onSelect={() => onSelect(node)}
              level={level}
              siblingSelected={hasSiblingSelected && node.id !== selectedId}
              classification={classificationsMap.get(node.id) ?? null}
              isMuted={vis === 'muted'}
              tagDefs={tagDefs}
              tagAssignments={tagAssignments}
              teamAssignments={teamAssignments}
            />
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/TreeView.tsx frontend/src/components/TileRow.tsx
git commit -m "feat(frontend): update TreeView/TileRow — remove descopedSet, use scopeStatuses filter, normalise VG matching"
```

---

## Task 11: Frontend — update ProcessTile

**Files:**
- Modify: `frontend/src/components/ProcessTile.tsx`

- [ ] **Step 1: Replace the file**

```typescript
import { useState, useRef } from 'react'
import { ProcessNode } from '../types/process'
import type { Classification } from '../types/classification'
import { SCOPE_STATUS_BORDER, SCOPE_STATUS_DOT } from '../types/classification'
import { ClassificationPanel } from './ClassificationPanel'
import { TagBadge } from './TagBadge'
import { TeamBadge } from './TeamBadge'
import { useNavigationStore } from '../store/navigation'
import type { TagDef, TagAssignment, TeamAssignment } from '../types/tags'

interface ProcessTileProps {
  node: ProcessNode
  isSelected: boolean
  onSelect: () => void
  level: number
  siblingSelected: boolean
  classification?: Classification | null
  isMuted?: boolean
  tagDefs?: TagDef[]
  tagAssignments?: TagAssignment[]
  teamAssignments?: TeamAssignment[]
}

const VG_CHIP: Record<string, { abbr: string; cls: string }> = {
  'Fulfillment':                   { abbr: 'FUL', cls: 'bg-blue-900 text-blue-300' },
  'Assurance':                     { abbr: 'ASR', cls: 'bg-amber-900 text-amber-300' },
  'Billing':                       { abbr: 'BIL', cls: 'bg-green-900 text-green-300' },
  'Operations Readiness & Support':{ abbr: 'ORS', cls: 'bg-slate-700 text-slate-300' },
  'operations Readiness & Support':{ abbr: 'ORS', cls: 'bg-slate-700 text-slate-300' },
  'Strategy Management':           { abbr: 'SMT', cls: 'bg-purple-900 text-purple-300' },
  'strategy Management':           { abbr: 'SMT', cls: 'bg-purple-900 text-purple-300' },
  'Business Value Development':    { abbr: 'BVD', cls: 'bg-fuchsia-900 text-fuchsia-300' },
  'business Value Development':    { abbr: 'BVD', cls: 'bg-fuchsia-900 text-fuchsia-300' },
  'Capability Management':         { abbr: 'CAP', cls: 'bg-teal-900 text-teal-300' },
}

function getLevelBackground(level: number): string {
  if (level === 1) return 'bg-gray-800'
  if (level === 2) return 'bg-[#1a2030]'
  return 'bg-[#151c28]'
}

export function ProcessTile({ node, isSelected, onSelect, level, siblingSelected, classification, isMuted = false, tagDefs = [], tagAssignments = [], teamAssignments = [] }: ProcessTileProps) {
  const [panelOpen, setPanelOpen] = useState(false)
  const [hovered, setHovered] = useState(false)
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { openDetail } = useNavigationStore()

  const nodeTagAssignments = tagAssignments.filter((a) => a.node_id === node.id)
  const nodeTeamAssignments = teamAssignments.filter((t) => t.node_id === node.id)
  const tagDefsMap = new Map(tagDefs.map((t) => [t.id, t]))

  const bgClass = getLevelBackground(level)
  const childCount = node.children.length
  const dimmed = !isSelected && siblingSelected

  const scopeStatus = classification?.scope_status ?? 'tbd'
  const borderColour = SCOPE_STATUS_BORDER[scopeStatus]
  const dotClass = SCOPE_STATUS_DOT[scopeStatus]

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setPanelOpen((v) => !v)
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    setPanelOpen(true)
  }

  if (isMuted) {
    return (
      <div className={['flex flex-col border-l-4 rounded p-3', 'min-w-[180px] flex-1 opacity-30 pointer-events-none', bgClass, borderColour].join(' ')}>
        <p className="text-sm font-semibold text-white line-clamp-2">{node.name}</p>
      </div>
    )
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => { hoverTimerRef.current = setTimeout(() => setHovered(true), 250) }}
      onMouseLeave={() => { if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current); setHovered(false) }}
    >
      <div
        onClick={onSelect}
        onContextMenu={handleContextMenu}
        className={[
          'flex flex-col border-l-4 rounded p-3 cursor-pointer',
          'min-w-[180px] flex-1 transition-opacity',
          bgClass, borderColour,
          isSelected ? 'ring-2 ring-blue-400 opacity-100' : '',
          dimmed ? 'opacity-60' : '',
        ].filter(Boolean).join(' ')}
      >
        <p className="text-sm font-semibold text-white line-clamp-2">{node.name}</p>
        <p className="text-xs font-mono text-gray-500">{node.id} · L{level}</p>

        {node.brief_description && (
          <p className="text-xs text-gray-400 mt-1 line-clamp-2">{node.brief_description}</p>
        )}

        {node.vertical_groups.length > 0 && (
          <div className="flex items-center gap-1 mt-1">
            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">vg</span>
            <div className="flex flex-wrap gap-1">
              {node.vertical_groups.map((vg) => {
                const chip = VG_CHIP[vg]
                if (!chip) return null
                return (
                  <span key={vg} title={vg} className={`text-[10px] font-semibold px-1 py-0.5 rounded ${chip.cls}`}>
                    {chip.abbr}
                  </span>
                )
              })}
            </div>
          </div>
        )}

        {(nodeTagAssignments.length > 0 || nodeTeamAssignments.length > 0) && (
          <div className="flex flex-wrap gap-1 mt-2">
            {nodeTagAssignments.map((a) => {
              const def = tagDefsMap.get(a.tag_id)
              return def ? <TagBadge key={a.tag_id} name={def.name} colour={def.colour} cascade={a.cascade === 'true'} /> : null
            })}
            {nodeTeamAssignments.map((t, i) => (
              <TeamBadge key={i} team={t.team} func={t.function} />
            ))}
          </div>
        )}

        {hovered && (
          <div className="absolute bottom-full left-0 mb-1 z-50 pointer-events-none bg-gray-900 border border-gray-700 rounded p-2 shadow-lg max-w-[240px] text-xs text-gray-300 leading-relaxed">
            {node.brief_description ?? node.name}
          </div>
        )}

        <div className="flex items-center justify-between mt-auto pt-2">
          <span className="text-xs text-gray-500">{childCount > 0 ? `${childCount} children` : ''}</span>
          <div className="flex items-center gap-1.5">
            {hovered && (
              <>
                <button onClick={(e) => { e.stopPropagation(); openDetail(node.id) }} className="text-gray-400 hover:text-white text-xs leading-none" title="View details" aria-label="Process info">ⓘ</button>
                <button onClick={handleEditClick} className="text-gray-400 hover:text-white text-xs leading-none" title="Edit scope" aria-label="Edit scope">✏️</button>
              </>
            )}
            <span className={`inline-block w-1.5 h-1.5 rounded-full ${dotClass}`} title={scopeStatus} />
          </div>
        </div>
      </div>

      {panelOpen && (
        <ClassificationPanel node={node} classification={classification ?? null} onClose={() => setPanelOpen(false)} />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/ProcessTile.tsx
git commit -m "feat(frontend): update ProcessTile colours for scope_status; remove isDescoped prop"
```

---

## Task 12: Frontend — update ProcessDetail, DomainTabs, and App

**Files:**
- Modify: `frontend/src/components/ProcessDetail.tsx`
- Modify: `frontend/src/components/DomainTabs.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Update ProcessDetail.tsx — remove descopedEntry, show scope_status/reason**

Replace the Classification section (lines 107–124 in the original) with:

```typescript
          {/* Classification */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Scope</h3>
            {classification ? (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className={`inline-block w-2 h-2 rounded-full ${SCOPE_STATUS_DOT[classification.scope_status]}`} />
                  <span className="text-sm text-white">{SCOPE_STATUS_LABELS[classification.scope_status]}</span>
                </div>
                {classification.reason && (
                  <p className="text-xs text-gray-400 mt-0.5">{classification.reason}</p>
                )}
                <div className="text-xs text-gray-500">{REVIEW_STATUS_LABELS[classification.review_status]}</div>
                {classification.notes && (
                  <p className="text-xs text-gray-400 mt-1">{classification.notes}</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Not assessed</p>
            )}
          </section>
```

Also update the import line at top of ProcessDetail.tsx to add the new exports:
```typescript
import type { Classification } from '../types/classification'
import { SCOPE_STATUS_DOT, SCOPE_STATUS_LABELS, REVIEW_STATUS_LABELS } from '../types/classification'
```

And remove the `descopedEntry` prop and all references to it from ProcessDetail.tsx (the `DescopedEntry` import, the prop interface, and the descoped conditional in Classification section).

The full updated `ProcessDetail.tsx`:

```typescript
import { useState } from 'react'
import type { ProcessNode } from '../types/process'
import type { Classification } from '../types/classification'
import { SCOPE_STATUS_DOT, SCOPE_STATUS_LABELS, REVIEW_STATUS_LABELS } from '../types/classification'
import { useTags, useTagAssignments, useUpdateNodeTags, useTeams, useUpdateNodeTeams } from '../hooks/useTags'
import { TagBadge } from './TagBadge'
import { TeamBadge } from './TeamBadge'
import { NotesEditor } from './NotesEditor'

interface ProcessDetailProps {
  node: ProcessNode
  classification?: Classification | null
  onClose: () => void
}

export function ProcessDetail({ node, classification, onClose }: ProcessDetailProps) {
  const { data: tagDefs = [] } = useTags()
  const { data: allAssignments = [] } = useTagAssignments()
  const { data: allTeams = [] } = useTeams()
  const updateNodeTags = useUpdateNodeTags()
  const updateNodeTeams = useUpdateNodeTeams()

  const nodeAssignments = allAssignments.filter((a) => a.node_id === node.id)
  const nodeTeams = allTeams.filter((t) => t.node_id === node.id)

  const [editingTags, setEditingTags] = useState(false)
  const [selectedTags, setSelectedTags] = useState<{ tag_id: string; cascade: boolean }[]>(
    nodeAssignments.map((a) => ({ tag_id: a.tag_id, cascade: a.cascade === 'true' }))
  )

  const [editingTeams, setEditingTeams] = useState(false)
  const [teamRows, setTeamRows] = useState<{ team: string; function: string }[]>(
    nodeTeams.map((t) => ({ team: t.team, function: t.function }))
  )
  const [newTeam, setNewTeam] = useState('')
  const [newFunc, setNewFunc] = useState('')

  function toggleTag(tagId: string) {
    setSelectedTags((prev) => {
      const exists = prev.find((t) => t.tag_id === tagId)
      return exists ? prev.filter((t) => t.tag_id !== tagId) : [...prev, { tag_id: tagId, cascade: false }]
    })
  }

  function toggleCascade(tagId: string) {
    setSelectedTags((prev) =>
      prev.map((t) => t.tag_id === tagId ? { ...t, cascade: !t.cascade } : t)
    )
  }

  function saveTags() {
    updateNodeTags.mutate({ nodeId: node.id, assignments: selectedTags })
    setEditingTags(false)
  }

  function addTeamRow() {
    if (!newTeam.trim()) return
    setTeamRows((prev) => [...prev, { team: newTeam.trim(), function: newFunc.trim() }])
    setNewTeam('')
    setNewFunc('')
  }

  function removeTeamRow(idx: number) {
    setTeamRows((prev) => prev.filter((_, i) => i !== idx))
  }

  function saveTeams() {
    updateNodeTeams.mutate({ nodeId: node.id, assignments: teamRows })
    setEditingTeams(false)
  }

  const tagDefsMap = new Map(tagDefs.map((t) => [t.id, t]))

  return (
    <div className="fixed inset-0 z-40 flex justify-end" onClick={onClose}>
      <div className="w-full max-w-md bg-gray-900 border-l border-gray-700 h-full overflow-y-auto shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-700">
          <div>
            <p className="text-xs text-gray-500 mb-1">Level {node.level} · {node.id}</p>
            <h2 className="text-white font-semibold text-base leading-snug">{node.name}</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl leading-none ml-4 mt-0.5">×</button>
        </div>

        <div className="flex-1 px-5 py-4 flex flex-col gap-5">
          {(node.brief_description || node.extended_description) && (
            <section>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Description</h3>
              {node.brief_description && <p className="text-sm text-gray-300 mb-2">{node.brief_description}</p>}
              {node.extended_description && <p className="text-xs text-gray-500 leading-relaxed">{node.extended_description}</p>}
            </section>
          )}

          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Scope</h3>
            {classification ? (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className={`inline-block w-2 h-2 rounded-full ${SCOPE_STATUS_DOT[classification.scope_status]}`} />
                  <span className="text-sm text-white">{SCOPE_STATUS_LABELS[classification.scope_status]}</span>
                </div>
                {classification.reason && <p className="text-xs text-gray-400 mt-0.5">{classification.reason}</p>}
                <div className="text-xs text-gray-500">{REVIEW_STATUS_LABELS[classification.review_status]}</div>
                {classification.notes && <p className="text-xs text-gray-400 mt-1">{classification.notes}</p>}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Not assessed</p>
            )}
          </section>

          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Tags</h3>
              {!editingTags && <button onClick={() => setEditingTags(true)} className="text-xs text-gray-500 hover:text-white">Edit</button>}
            </div>
            {editingTags ? (
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap gap-1.5">
                  {tagDefs.map((tag) => {
                    const selected = selectedTags.find((t) => t.tag_id === tag.id)
                    const cascade = selected?.cascade ?? false
                    return (
                      <div key={tag.id} className="flex items-center gap-1">
                        <button onClick={() => toggleTag(tag.id)} className={`text-xs px-2 py-0.5 rounded border transition-colors ${selected ? 'opacity-100' : 'opacity-40'}`} style={{ borderColor: tag.colour, color: tag.colour, backgroundColor: selected ? tag.colour + '22' : undefined }}>
                          {tag.name}
                        </button>
                        {selected && (
                          <button onClick={() => toggleCascade(tag.id)} className={`text-xs px-1 py-0.5 rounded border ${cascade ? 'border-gray-400 text-gray-300' : 'border-gray-700 text-gray-600'}`} title="Cascade to children">↓</button>
                        )}
                      </div>
                    )
                  })}
                  {tagDefs.length === 0 && <p className="text-xs text-gray-500">No tags defined. Use the Tags button to create some.</p>}
                </div>
                <div className="flex gap-2">
                  <button onClick={saveTags} className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded">Save</button>
                  <button onClick={() => { setSelectedTags(nodeAssignments.map((a) => ({ tag_id: a.tag_id, cascade: a.cascade === 'true' }))); setEditingTags(false) }} className="text-xs text-gray-400 hover:text-white px-2 py-1">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {nodeAssignments.length === 0 && <p className="text-xs text-gray-500">No tags assigned</p>}
                {nodeAssignments.map((a) => {
                  const def = tagDefsMap.get(a.tag_id)
                  return def ? <TagBadge key={a.tag_id} name={def.name} colour={def.colour} cascade={a.cascade === 'true'} /> : null
                })}
              </div>
            )}
          </section>

          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Teams</h3>
              {!editingTeams && <button onClick={() => setEditingTeams(true)} className="text-xs text-gray-500 hover:text-white">Edit</button>}
            </div>
            {editingTeams ? (
              <div className="flex flex-col gap-2">
                {teamRows.map((row, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-white flex-1">{row.team}{row.function ? ` · ${row.function}` : ''}</span>
                    <button onClick={() => removeTeamRow(i)} className="text-xs text-gray-600 hover:text-red-400">Remove</button>
                  </div>
                ))}
                <div className="flex gap-1.5 mt-1">
                  <input value={newTeam} onChange={(e) => setNewTeam(e.target.value)} placeholder="Team" className="bg-gray-800 text-white rounded px-2 py-1 text-xs flex-1 focus:outline-none focus:ring-1 focus:ring-gray-600" />
                  <input value={newFunc} onChange={(e) => setNewFunc(e.target.value)} placeholder="Function" className="bg-gray-800 text-white rounded px-2 py-1 text-xs flex-1 focus:outline-none focus:ring-1 focus:ring-gray-600" onKeyDown={(e) => e.key === 'Enter' && addTeamRow()} />
                  <button onClick={addTeamRow} className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded">Add</button>
                </div>
                <div className="flex gap-2">
                  <button onClick={saveTeams} className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded">Save</button>
                  <button onClick={() => { setTeamRows(nodeTeams.map((t) => ({ team: t.team, function: t.function }))); setEditingTeams(false) }} className="text-xs text-gray-400 hover:text-white px-2 py-1">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {nodeTeams.length === 0 && <p className="text-xs text-gray-500">No teams assigned</p>}
                {nodeTeams.map((t, i) => <TeamBadge key={i} team={t.team} func={t.function} />)}
              </div>
            )}
          </section>

          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Notes</h3>
            <NotesEditor nodeId={node.id} />
          </section>

          <section className="text-xs text-gray-600 flex flex-col gap-1 mt-auto pt-2 border-t border-gray-800">
            {node.domain && <div>Domain: {node.domain}</div>}
            {node.vertical_groups.length > 0 && <div>Vertical group: {node.vertical_groups.join(', ')}</div>}
            {node.children.length > 0 && <div>{node.children.length} child processes</div>}
          </section>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Update DomainTabs.tsx — add List tab**

```typescript
import type { ProcessNode } from '../types/process'
import { useNavigationStore } from '../store/navigation'

interface DomainTabsProps {
  domains: ProcessNode[]
  activeView: 'tree' | 'list'
  onViewChange: (view: 'tree' | 'list') => void
}

export function DomainTabs({ domains, activeView, onViewChange }: DomainTabsProps) {
  const { activeDomainId, setActiveDomain } = useNavigationStore()

  return (
    <div className="bg-gray-800 w-full flex">
      {domains.map((domain) => {
        const isActive = activeView === 'tree' && domain.id === activeDomainId
        return (
          <button
            key={domain.id}
            onClick={() => { onViewChange('tree'); setActiveDomain(domain.id) }}
            className={
              isActive
                ? 'px-5 py-3 text-sm font-medium text-white border-b-2 border-blue-500'
                : 'px-5 py-3 text-sm font-medium text-gray-400 hover:text-gray-200 border-b-2 border-transparent'
            }
          >
            {domain.name}
          </button>
        )
      })}
      <div className="flex-1" />
      <button
        onClick={() => onViewChange('list')}
        className={
          activeView === 'list'
            ? 'px-5 py-3 text-sm font-medium text-white border-b-2 border-blue-500'
            : 'px-5 py-3 text-sm font-medium text-gray-400 hover:text-gray-200 border-b-2 border-transparent'
        }
      >
        List
      </button>
    </div>
  )
}
```

- [ ] **Step 3: Update App.tsx**

```typescript
import { useEffect, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ProcessNode } from './types/process'
import { TopBar } from './components/TopBar'
import { DomainTabs } from './components/DomainTabs'
import { FilterBar } from './components/FilterBar'
import { TreeView } from './components/TreeView'
import { L2ListView } from './components/L2ListView'
import { ValueStreamsView } from './components/ValueStreamsView'
import { TagManager } from './components/TagManager'
import { ProcessDetail } from './components/ProcessDetail'
import { ChatPanel } from './components/ChatPanel'
import { ExportDialog } from './components/ExportDialog'
import { useProcessTree } from './hooks/useProcessTree'
import { useNavigationStore } from './store/navigation'
import { useClassifications } from './hooks/useClassifications'

const queryClient = new QueryClient()

function AppInner() {
  const { data: tree, isLoading, isError } = useProcessTree()
  const { activeDomainId, setActiveDomain, detailNodeId, closeDetail } = useNavigationStore()
  const { data: classifications = [] } = useClassifications()
  const [tagManagerOpen, setTagManagerOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [valueStreamsOpen, setValueStreamsOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [activeView, setActiveView] = useState<'tree' | 'list'>('tree')

  useEffect(() => {
    if (tree && tree.length > 0 && !activeDomainId) {
      setActiveDomain(tree[0].id)
    }
  }, [tree, activeDomainId, setActiveDomain])

  const activeDomain = tree?.find((d) => d.id === activeDomainId) ?? tree?.[0]

  const detailNode = detailNodeId && tree
    ? (() => {
        function find(nodes: ProcessNode[]): ProcessNode | null {
          for (const n of nodes) {
            if (n.id === detailNodeId) return n
            const found = find(n.children)
            if (found) return found
          }
          return null
        }
        return find(tree)
      })()
    : null

  const detailClassification = classifications.find((c) => c.id === detailNodeId) ?? null

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <TopBar
        onOpenTagManager={() => setTagManagerOpen(true)}
        onOpenChat={() => setChatOpen(true)}
        onToggleValueStreams={() => setValueStreamsOpen((v) => !v)}
        valueStreamsActive={valueStreamsOpen}
        onOpenExport={() => setExportOpen(true)}
      />
      {isLoading && (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Loading processes...</div>
      )}
      {isError && (
        <div className="flex-1 flex items-center justify-center text-red-400 text-sm">Failed to load process tree.</div>
      )}
      {tree && (
        <>
          <DomainTabs domains={tree} activeView={activeView} onViewChange={setActiveView} />
          <FilterBar />
          <div className="flex-1 bg-gray-950 flex flex-col overflow-hidden">
            {valueStreamsOpen
              ? <ValueStreamsView />
              : activeView === 'list'
                ? <L2ListView />
                : activeDomain && <TreeView domain={activeDomain} />
            }
          </div>
        </>
      )}
      {tagManagerOpen && <TagManager onClose={() => setTagManagerOpen(false)} />}
      {chatOpen && <ChatPanel onClose={() => setChatOpen(false)} />}
      {exportOpen && <ExportDialog onClose={() => setExportOpen(false)} />}
      {detailNode && (
        <ProcessDetail
          node={detailNode}
          classification={detailClassification}
          onClose={closeDetail}
        />
      )}
    </div>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppInner />
    </QueryClientProvider>
  )
}

export default App
```

- [ ] **Step 4: Run build — expect zero errors**

```bash
cd frontend && npm run build 2>&1 | tail -20
```
Expected: `✓ built in Xs` with no TypeScript errors. If errors remain they will point to the L2ListView import (not yet created) — that's expected; proceed to Task 13.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ProcessDetail.tsx frontend/src/components/DomainTabs.tsx frontend/src/App.tsx
git commit -m "feat(frontend): update ProcessDetail/DomainTabs/App — remove descoped, add List tab toggle"
```

---

## Task 13: Frontend — L2ListView and ScopeDropdown

**Files:**
- Create: `frontend/src/components/ScopeDropdown.tsx`
- Create: `frontend/src/components/L2ListView.tsx`

- [ ] **Step 1: Create ScopeDropdown.tsx**

```typescript
import { useState, useRef, useEffect } from 'react'
import type { Classification, ScopeStatus } from '../types/classification'
import { SCOPE_STATUS_LABELS, SCOPE_STATUS_BG, SCOPE_STATUS_DOT, SCOPE_STATUSES } from '../types/classification'
import { useUpdateClassification } from '../hooks/useClassifications'
import type { ProcessNode } from '../types/process'

interface ScopeDropdownProps {
  node: ProcessNode
  classification: Classification | null
}

export function ScopeDropdown({ node, classification }: ScopeDropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const updateClassification = useUpdateClassification()
  const current = classification?.scope_status ?? 'tbd'

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function handleSelect(status: ScopeStatus) {
    updateClassification.mutate({
      id: node.id,
      scope_status: status,
      review_status: classification?.review_status ?? 'unreviewed',
      reason: classification?.reason ?? '',
      notes: classification?.notes ?? '',
    })
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`text-xs px-2 py-0.5 rounded text-white flex items-center gap-1 ${SCOPE_STATUS_BG[current]}`}
      >
        <span className={`inline-block w-1.5 h-1.5 rounded-full bg-white/60`} />
        {SCOPE_STATUS_LABELS[current]}
        <span className="text-white/60 ml-0.5">▾</span>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-gray-800 border border-gray-700 rounded shadow-lg min-w-[130px]">
          {SCOPE_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => handleSelect(s)}
              className={`w-full text-left text-xs px-3 py-1.5 flex items-center gap-2 hover:bg-gray-700 ${s === current ? 'text-white' : 'text-gray-300'}`}
            >
              <span className={`inline-block w-2 h-2 rounded-full ${SCOPE_STATUS_DOT[s]}`} />
              {SCOPE_STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create L2ListView.tsx**

```typescript
import { useMemo, useState } from 'react'
import type { ProcessNode } from '../types/process'
import type { Classification } from '../types/classification'
import { REVIEW_STATUS_LABELS } from '../types/classification'
import { useProcessTree } from '../hooks/useProcessTree'
import { useClassifications } from '../hooks/useClassifications'
import { useTags, useTagAssignments, useTeams } from '../hooks/useTags'
import { useFilterStore } from '../store/filters'
import { useNavigationStore } from '../store/navigation'
import { ScopeDropdown } from './ScopeDropdown'
import { TagBadge } from './TagBadge'
import { TeamBadge } from './TeamBadge'

function normalizeVG(vg: string): string {
  return vg.trim().toLowerCase()
}

type SortKey = 'name' | 'domain' | 'scope' | 'status'

export function L2ListView() {
  const { data: tree = [] } = useProcessTree()
  const { data: classifications = [] } = useClassifications()
  const { data: tagDefs = [] } = useTags()
  const { data: tagAssignments = [] } = useTagAssignments()
  const { data: teamAssignments = [] } = useTeams()
  const { scopeStatuses, reviewStatuses, selectedTags, selectedTeam, selectedVGs } = useFilterStore()
  const { openDetail } = useNavigationStore()

  const [sortKey, setSortKey] = useState<SortKey>('domain')
  const [sortAsc, setSortAsc] = useState(true)

  const classificationsMap = useMemo(() => {
    const map = new Map<string, Classification>()
    for (const c of classifications) map.set(c.id, c)
    return map
  }, [classifications])

  const tagAssignmentMap = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const a of tagAssignments) map.set(a.node_id, [...(map.get(a.node_id) ?? []), a.tag_id])
    return map
  }, [tagAssignments])

  const teamAssignmentMap = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const t of teamAssignments) map.set(t.node_id, [...(map.get(t.node_id) ?? []), t.team])
    return map
  }, [teamAssignments])

  const tagDefsMap = new Map(tagDefs.map((t) => [t.id, t]))

  const l2Nodes = useMemo(() => {
    const nodes: ProcessNode[] = []
    for (const domain of tree) {
      for (const child of domain.children) {
        if (child.level === 2) nodes.push(child)
      }
    }
    return nodes
  }, [tree])

  const filtered = useMemo(() => {
    return l2Nodes.filter((node) => {
      const cls = classificationsMap.get(node.id)

      if (scopeStatuses.length > 0) {
        const ss = cls?.scope_status ?? 'tbd'
        if (!scopeStatuses.includes(ss)) return false
      }

      if (reviewStatuses.length > 0) {
        const rs = cls?.review_status ?? 'unreviewed'
        if (!reviewStatuses.includes(rs)) return false
      }

      if (selectedTags.length > 0) {
        const nodeTags = tagAssignmentMap.get(node.id) ?? []
        if (!selectedTags.some((t) => nodeTags.includes(t))) return false
      }

      if (selectedTeam !== null) {
        const nodeTeams = teamAssignmentMap.get(node.id) ?? []
        if (!nodeTeams.includes(selectedTeam)) return false
      }

      if (selectedVGs.length > 0) {
        const normalizedSelected = selectedVGs.map(normalizeVG)
        if (!node.vertical_groups.some(vg => normalizedSelected.includes(normalizeVG(vg)))) return false
      }

      return true
    })
  }, [l2Nodes, classificationsMap, scopeStatuses, reviewStatuses, selectedTags, tagAssignmentMap, selectedTeam, teamAssignmentMap, selectedVGs])

  const SCOPE_ORDER: Record<string, number> = { in_scope: 0, gap: 1, adjacent: 2, tbd: 3, out_of_scope: 4 }

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0
      if (sortKey === 'name') {
        cmp = a.name.localeCompare(b.name)
      } else if (sortKey === 'domain') {
        cmp = (a.domain ?? '').localeCompare(b.domain ?? '') || a.name.localeCompare(b.name)
      } else if (sortKey === 'scope') {
        const sa = classificationsMap.get(a.id)?.scope_status ?? 'tbd'
        const sb = classificationsMap.get(b.id)?.scope_status ?? 'tbd'
        cmp = (SCOPE_ORDER[sa] ?? 99) - (SCOPE_ORDER[sb] ?? 99) || a.name.localeCompare(b.name)
      } else if (sortKey === 'status') {
        const ra = classificationsMap.get(a.id)?.review_status ?? 'unreviewed'
        const rb = classificationsMap.get(b.id)?.review_status ?? 'unreviewed'
        cmp = ra.localeCompare(rb) || a.name.localeCompare(b.name)
      }
      return sortAsc ? cmp : -cmp
    })
  }, [filtered, sortKey, sortAsc, classificationsMap])

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((v) => !v)
    else { setSortKey(key); setSortAsc(true) }
  }

  function SortHeader({ label, k }: { label: string; k: SortKey }) {
    return (
      <th
        onClick={() => handleSort(k)}
        className="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide cursor-pointer hover:text-white select-none"
      >
        {label}{sortKey === k ? (sortAsc ? ' ↑' : ' ↓') : ''}
      </th>
    )
  }

  const VG_CHIP: Record<string, { abbr: string; cls: string }> = {
    'Fulfillment':                   { abbr: 'FUL', cls: 'bg-blue-900 text-blue-300' },
    'Assurance':                     { abbr: 'ASR', cls: 'bg-amber-900 text-amber-300' },
    'Billing':                       { abbr: 'BIL', cls: 'bg-green-900 text-green-300' },
    'Operations Readiness & Support':{ abbr: 'ORS', cls: 'bg-slate-700 text-slate-300' },
    'operations Readiness & Support':{ abbr: 'ORS', cls: 'bg-slate-700 text-slate-300' },
    'Strategy Management':           { abbr: 'SMT', cls: 'bg-purple-900 text-purple-300' },
    'strategy Management':           { abbr: 'SMT', cls: 'bg-purple-900 text-purple-300' },
    'Business Value Development':    { abbr: 'BVD', cls: 'bg-fuchsia-900 text-fuchsia-300' },
    'business Value Development':    { abbr: 'BVD', cls: 'bg-fuchsia-900 text-fuchsia-300' },
    'Capability Management':         { abbr: 'CAP', cls: 'bg-teal-900 text-teal-300' },
  }

  return (
    <div className="flex-1 overflow-auto px-5 py-4 bg-gray-950">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-gray-500">{sorted.length} of {l2Nodes.length} L2 processes</p>
      </div>
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 bg-gray-900 z-10">
          <tr className="border-b border-gray-700">
            <SortHeader label="Process" k="name" />
            <SortHeader label="Domain" k="domain" />
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">VG</th>
            <SortHeader label="Scope" k="scope" />
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Tags</th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Team</th>
            <SortHeader label="Status" k="status" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((node) => {
            const cls = classificationsMap.get(node.id) ?? null
            const nodeTags = tagAssignmentMap.get(node.id) ?? []
            const nodeTeams = (teamAssignments ?? []).filter((t) => t.node_id === node.id)
            const rs = cls?.review_status ?? 'unreviewed'

            return (
              <tr
                key={node.id}
                onClick={() => openDetail(node.id)}
                className="border-b border-gray-800 hover:bg-gray-900 cursor-pointer"
              >
                <td className="px-3 py-2">
                  <p className="text-white font-medium">{node.name}</p>
                  <p className="text-xs font-mono text-gray-500">{node.id}</p>
                </td>
                <td className="px-3 py-2 text-xs text-gray-400 whitespace-nowrap">{node.domain ?? '—'}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {node.vertical_groups.map((vg) => {
                      const chip = VG_CHIP[vg]
                      return chip ? (
                        <span key={vg} title={vg} className={`text-[10px] font-semibold px-1 py-0.5 rounded ${chip.cls}`}>{chip.abbr}</span>
                      ) : null
                    })}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <ScopeDropdown node={node} classification={cls} />
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {nodeTags.map((tagId) => {
                      const def = tagDefsMap.get(tagId)
                      const assignment = tagAssignments.find((a) => a.node_id === node.id && a.tag_id === tagId)
                      return def ? <TagBadge key={tagId} name={def.name} colour={def.colour} cascade={assignment?.cascade === 'true'} /> : null
                    })}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {nodeTeams.map((t, i) => <TeamBadge key={i} team={t.team} func={t.function} />)}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <span className="text-xs text-gray-400">{REVIEW_STATUS_LABELS[rs]}</span>
                </td>
              </tr>
            )
          })}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={7} className="px-3 py-8 text-center text-sm text-gray-500">No processes match the current filters.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 3: Run build — expect zero errors**

```bash
cd frontend && npm run build 2>&1 | tail -10
```
Expected: `✓ built in Xs`

- [ ] **Step 4: Start the app and verify manually**

```bash
# Terminal 1 — backend
cd backend
EXCEL_PATH=../docs/GB921_Business_Process_Framework_Processes_Excel_v25.5.xlsx \
  DATA_DIR=../data \
  uvicorn app.main:app --reload --port 8000

# Terminal 2 — frontend
cd frontend && npm run dev
```

Open `http://localhost:5173` and verify:

1. **FilterBar** shows TBD/In Scope/Adjacent/Out of Scope/Gap buttons (not OSS/BSS)
2. **Descoped 3-way toggle** is gone
3. **S2R/OPS buttons** visible; clicking S2R activates SMT/CAP/BVD chips; clicking again clears them
4. **VG buttons** show full name tooltip on hover
5. **List tab** appears at the right end of the domain tabs
6. **List tab click** → table showing all L2 processes with Scope dropdown in each row
7. **Scope dropdown** → click a process's scope button, select a value, table updates without page reload
8. **✏️ pencil button** on a tile → panel shows Scope radios, Reason field, Tags, Save button
9. **Tags can be assigned** from the ✏️ panel (bug item 2 fixed)
10. **Backend logs** show migration messages on first start (if existing data had `category` column)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ScopeDropdown.tsx frontend/src/components/L2ListView.tsx
git commit -m "feat(frontend): add L2ListView with inline scope editing and ScopeDropdown"
```

- [ ] **Step 6: Final build verification**

```bash
cd frontend && npm run build
```
Expected: zero errors, clean build output.

- [ ] **Step 7: Final commit**

```bash
git add -A
git status  # verify only expected files
git commit -m "feat: programme scope workflow complete — scope_status, L2 list view, lifecycle filter"
```
