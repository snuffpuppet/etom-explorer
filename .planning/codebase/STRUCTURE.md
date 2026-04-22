# Codebase Structure

**Analysis Date:** 2026-04-22

## Directory Layout

```
etom-explorer/
├── backend/                  # FastAPI Python backend
│   ├── app/
│   │   ├── main.py           # App factory, lifespan, router registration
│   │   ├── models.py         # All Pydantic models
│   │   ├── parser.py         # Excel → ProcessNode tree (startup only)
│   │   ├── persistence.py    # Markdown/YAML read-write layer
│   │   ├── utils.py          # find_node() tree traversal helper
│   │   ├── llm/
│   │   │   ├── client.py     # LLM provider abstraction (Claude / OpenRouter)
│   │   │   ├── prompts.py    # System prompt builders
│   │   │   └── seeding.py    # Bulk LLM classification seeding
│   │   └── routers/
│   │       ├── processes.py
│   │       ├── classifications.py
│   │       ├── descoped.py
│   │       ├── tags.py
│   │       ├── teams.py
│   │       ├── notes.py
│   │       ├── value_streams.py
│   │       ├── search.py
│   │       ├── chat.py
│   │       ├── llm.py
│   │       └── export.py
│   └── scripts/              # Standalone utility scripts
├── frontend/                 # React + Vite + TypeScript SPA
│   └── src/
│       ├── main.tsx          # React root mount
│       ├── App.tsx           # Root layout component
│       ├── index.css         # Global styles (Tailwind)
│       ├── api/
│       │   └── client.ts     # apiFetch<T> wrapper
│       ├── hooks/
│       │   ├── useProcessTree.ts
│       │   ├── useClassifications.ts
│       │   ├── useTags.ts
│       │   ├── useValueStreams.ts
│       │   └── useNotes.ts
│       ├── store/
│       │   ├── navigation.ts  # Zustand: active domain, drillPath, detail node
│       │   └── filters.ts     # Zustand: category/review/tag/team filters
│       ├── types/
│       │   ├── process.ts     # ProcessNode TypeScript interface
│       │   ├── classification.ts
│       │   └── tags.ts
│       └── components/       # Flat directory — all components at same level
│           ├── TopBar.tsx
│           ├── DomainTabs.tsx
│           ├── FilterBar.tsx
│           ├── TreeView.tsx
│           ├── TileRow.tsx
│           ├── ProcessTile.tsx
│           ├── ProcessDetail.tsx
│           ├── ProcessLink.tsx
│           ├── NotesEditor.tsx
│           ├── TagManager.tsx
│           ├── TagBadge.tsx
│           ├── TeamBadge.tsx
│           ├── ChatPanel.tsx
│           ├── ChatMessage.tsx
│           ├── ValueStreamsView.tsx
│           ├── SearchBox.tsx
│           ├── ExportDialog.tsx
│           ├── ModelSelector.tsx
│           └── SeedingButton.tsx
├── data/                     # Markdown annotation files (Docker volume mount)
│   ├── classifications.md
│   ├── descoped.md
│   ├── tags.md
│   ├── tag_assignments.md
│   ├── teams.md
│   ├── value-streams.md
│   └── notes/                # Per-node freeform notes
│       └── <safe_id>.md      # e.g. 1_2_3_4.md (dots/slashes → underscores)
├── docs/                     # Reference documentation
│   └── superpowers/specs/    # Feature specs
├── .planning/                # GSD planning artefacts
│   └── codebase/             # Codebase map documents (this directory)
├── docker-compose.yml
├── Makefile
├── CLAUDE.md                 # Project instructions for Claude Code
└── README.md
```

## Directory Purposes

**`backend/app/routers/`:**
- Purpose: One file per API domain; each registers an `APIRouter` included by `main.py`
- Contains: Route handlers, domain-specific logic (e.g. grouping, validation)
- Key files: `processes.py` (tree read), `classifications.py` (upsert pattern), `chat.py` (SSE streaming), `export.py` (doc generation)

**`backend/app/llm/`:**
- Purpose: LLM provider abstraction; isolates AI-specific code from routers
- Contains: `client.py` (streaming), `prompts.py` (system prompt construction), `seeding.py` (bulk classification)

**`frontend/src/hooks/`:**
- Purpose: React Query wrappers — one file groups queries and mutations for a single resource
- Contains: Query hooks (`useX`) and mutation hooks (`useCreateX`, `useUpdateX`, `useDeleteX`)
- Pattern: Mutations call `qc.invalidateQueries({ queryKey: [...] })` on success

**`frontend/src/store/`:**
- Purpose: Zustand stores for client-only UI state (not persisted)
- Contains: `navigation.ts` (where in the tree the user is), `filters.ts` (active filter selections)

**`frontend/src/components/`:**
- Purpose: All React components — flat layout, no subdirectory nesting
- Contains: Layout components (TopBar, DomainTabs, FilterBar), tree display (TreeView, TileRow, ProcessTile), detail panel (ProcessDetail, NotesEditor), modals (TagManager, ChatPanel, ExportDialog, ValueStreamsView)

**`frontend/src/types/`:**
- Purpose: TypeScript type definitions mirroring backend Pydantic models
- Contains: `process.ts` (ProcessNode), `classification.ts` (Classification, DescopedEntry), `tags.ts` (TagDef, TagAssignment, TeamAssignment, SearchResult)

**`data/`:**
- Purpose: Persistent annotation store — Markdown files written by the backend, mounted as a Docker volume
- Contains: 6 table files + `notes/` subdirectory
- Generated: No (hand-editable, git-committed)
- Committed: Yes

## Key File Locations

**Entry Points:**
- `backend/app/main.py`: FastAPI app factory, startup logic, router registration
- `frontend/src/main.tsx`: React DOM mount
- `frontend/src/App.tsx`: Root layout, modal state, domain/detail resolution

**Configuration:**
- `docker-compose.yml`: Service definitions, volume mounts, port mapping
- `backend/app/main.py`: `EXCEL_PATH` and `DATA_DIR` env var defaults
- `backend/app/persistence.py`: `DATA_DIR` env var, `_DEFAULT_DATA_DIR = "/app/data"`

**Core Logic:**
- `backend/app/parser.py`: `parse_excel()` — the only place the Excel file is read
- `backend/app/persistence.py`: `read_md_file`, `write_md_file`, `parse_md_table`, `write_md_table`, `read_note`, `write_note`
- `backend/app/utils.py`: `find_node()` — recursive tree traversal used by all routers needing node validation
- `frontend/src/store/navigation.ts`: `drillPath` logic; `selectNode(id, level)` truncates and appends

**Testing:**
- `backend/app/persistence.py` (lines 191–207): Self-test via `if __name__ == "__main__"` block — run with `python app/persistence.py`
- `backend/test_parser.py`: Parser tests — run with `python test_parser.py`
- No frontend test suite

## Naming Conventions

**Backend files:**
- Snake_case module names: `main.py`, `parser.py`, `persistence.py`, `value_streams.py`
- Router files named by resource (singular or plural as fits): `processes.py`, `classifications.py`, `tags.py`
- Data files use kebab-case with `.md` extension: `value-streams.md`, `tag_assignments.md`

**Frontend files:**
- PascalCase for components: `TreeView.tsx`, `ProcessDetail.tsx`, `TagManager.tsx`
- camelCase for hooks: `useProcessTree.ts`, `useClassifications.ts`
- camelCase for stores: `navigation.ts`, `filters.ts`
- camelCase for API: `client.ts`
- camelCase for type files: `process.ts`, `classification.ts`, `tags.ts`

**Notes files:**
- `data/notes/<safe_id>.md` where `safe_id` is the node ID with `.` and `/` replaced by `_`
- e.g. node `1.2.3.4` → `data/notes/1_2_3_4.md`
- e.g. node `D-Customer` → `data/notes/D-Customer.md`

## Where to Add New Code

**New API resource (backend):**
- Router: `backend/app/routers/<resource>.py` — create `router = APIRouter()`, register handlers
- Models: Add Pydantic models to `backend/app/models.py`
- Data file: Add a new `<resource>.md` file with YAML frontmatter + Markdown table; register in `persistence.ensure_data_files()`
- Register router: Add `app.include_router(<resource>.router, prefix="/api")` in `backend/app/main.py`

**New frontend data resource:**
- Types: `frontend/src/types/<resource>.ts`
- Hook: `frontend/src/hooks/use<Resource>.ts` — query + mutations using `apiFetch`
- Use in components: import hook directly; invalidate cache on mutation success

**New component:**
- Implementation: `frontend/src/components/<ComponentName>.tsx` (flat — no subdirectories)
- No barrel file needed; import directly by path

**New utility (backend):**
- Shared tree helpers: add to `backend/app/utils.py`
- LLM-specific: add to `backend/app/llm/`

## Special Directories

**`data/`:**
- Purpose: All user annotation files; runtime-written by backend
- Generated: Partially (files created by `ensure_data_files()` on first startup if missing)
- Committed: Yes — initial state committed, user changes accumulate

**`data/notes/`:**
- Purpose: One `.md` file per annotated process node
- Generated: Yes (created on first write for that node)
- Committed: Yes

**`frontend/dist/`:**
- Purpose: Vite build output; served by Docker container
- Generated: Yes (`npm run build`)
- Committed: No

**`.planning/`:**
- Purpose: GSD planning artefacts (codebase maps, phase plans)
- Generated: By GSD tooling
- Committed: Yes

---

*Structure analysis: 2026-04-22*
