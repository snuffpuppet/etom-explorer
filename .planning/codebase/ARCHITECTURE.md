# Architecture

**Analysis Date:** 2026-04-22

## Pattern Overview

**Overall:** Client-Server SPA with read-only in-memory tree + file-backed annotation store

**Key Characteristics:**
- Process tree is immutable after startup — parsed from Excel once into `app.state.process_tree`, never modified
- All user annotations (classifications, tags, teams, notes, value streams) are persisted as Markdown files with YAML frontmatter in `data/`
- Frontend fetches the full process tree once (`staleTime: Infinity`) and all annotation data on demand (`staleTime: 0`)
- No database — persistence layer is a custom Markdown/YAML read-write module

## Layers

**Backend — API Layer:**
- Purpose: Expose REST endpoints; route requests to persistence or tree lookups
- Location: `backend/app/routers/`
- Contains: One router file per domain (processes, classifications, descoped, tags, teams, search, chat, llm, notes, value_streams, export)
- Depends on: `app.state.process_tree`, `persistence.py`, `models.py`, `utils.py`
- Used by: Frontend via HTTP `/api/*`

**Backend — Domain Models:**
- Purpose: Define all data shapes shared between parser output, API request/response bodies
- Location: `backend/app/models.py`
- Contains: Pydantic models — `ProcessNode`, `Classification`, `TagDef`, `TagAssignment`, `TeamAssignment`, `ValueStream`, `SearchResult`, `ExportRequest`, etc.
- Depends on: Pydantic only
- Used by: All routers, `parser.py`

**Backend — Process Tree (startup-only):**
- Purpose: Parse the GB921 Excel file into an in-memory tree of `ProcessNode` objects
- Location: `backend/app/parser.py`
- Contains: `parse_excel(path)` — returns `list[ProcessNode]` (8 domain roots, each with L2–L7 children nested)
- Depends on: `openpyxl`, `models.py`
- Used by: `main.py` lifespan handler — result stored in `app.state.process_tree`

**Backend — Persistence Layer:**
- Purpose: All reads and writes to `data/*.md` files
- Location: `backend/app/persistence.py`
- Contains: `read_md_file`, `write_md_file`, `parse_md_table`, `write_md_table`, `read_note`, `write_note`, `ensure_data_files`
- Depends on: `PyYAML`, standard `pathlib`/`os`
- Used by: All annotation routers (classifications, descoped, tags, teams, notes, value_streams, export, chat)

**Backend — LLM Abstraction:**
- Purpose: Uniform streaming interface to Claude (direct) and OpenRouter
- Location: `backend/app/llm/client.py`, `backend/app/llm/prompts.py`
- Contains: `stream_chat(provider, model, system, messages)`, model lists
- Depends on: `anthropic` SDK, `httpx`
- Used by: `routers/chat.py`, `routers/llm.py`

**Frontend — Root Layout:**
- Purpose: Top-level component; owns modal open/close state; wraps everything in QueryClientProvider
- Location: `frontend/src/App.tsx`
- Contains: `AppInner` (reads tree + navigation state, renders layout panels, resolves detail node), `App` (QueryClientProvider wrapper)
- Depends on: All major hooks, `useNavigationStore`, all top-level components

**Frontend — State Management:**
- Purpose: Client-side navigation state (active domain, drill path, detail node) and filter state
- Location: `frontend/src/store/navigation.ts`, `frontend/src/store/filters.ts`
- Contains: Zustand stores — `useNavigationStore` (activeDomainId, drillPath, detailNodeId), `useFilterStore` (categories, reviewStatuses, showDescoped, selectedTags, selectedTeam)
- Depends on: Zustand
- Used by: `App.tsx`, `TreeView.tsx`, `FilterBar.tsx`

**Frontend — Data Hooks:**
- Purpose: React Query wrappers for all API resources; handle caching, mutations, cache invalidation
- Location: `frontend/src/hooks/`
- Contains: `useProcessTree`, `useClassifications`, `useDescoped`, `useTags`, `useTagAssignments`, `useTeams`, `useValueStreams`, `useNotes`, `useSearch` — plus mutation hooks (`useUpdateClassification`, `useCreateTag`, `useUpdateNodeTags`, etc.)
- Depends on: `@tanstack/react-query`, `api/client.ts`
- Used by: Components only

**Frontend — API Client:**
- Purpose: Single fetch wrapper; adds `/api` prefix and throws on non-OK responses
- Location: `frontend/src/api/client.ts`
- Contains: `apiFetch<T>(path, options?)` — typed generic fetch
- Depends on: Native `fetch`
- Used by: All hooks in `src/hooks/`

**Frontend — Components:**
- Purpose: Presentational and interactive UI
- Location: `frontend/src/components/` (flat, no subdirectories)
- Contains: `TreeView`, `TileRow`, `ProcessTile`, `ProcessDetail`, `TopBar`, `DomainTabs`, `FilterBar`, `TagManager`, `ChatPanel`, `ChatMessage`, `NotesEditor`, `ValueStreamsView`, `ExportDialog`, `SearchBox`, `TagBadge`, `TeamBadge`, `ProcessLink`, `ModelSelector`, `SeedingButton`
- Depends on: Hooks, Zustand stores, `types/`
- Used by: `App.tsx`

## Data Flow

**Process Tree Load (startup):**

1. FastAPI lifespan handler calls `parse_excel(EXCEL_PATH)` in `backend/app/parser.py`
2. Parser opens the `eTOM25,5` worksheet using `openpyxl`
3. 8 synthetic domain root nodes (L1) are created from `DOMAIN_DEFINITIONS`
4. L2–L7 rows are read into a flat dict keyed by `Process identifier`
5. `parent_id` assigned: L2 nodes attach to domain root by domain name; L3+ strip last dotted segment
6. Children wired level-by-level (sorted ascending by level)
7. Result (`list[ProcessNode]`) stored in `app.state.process_tree` — never modified again

**Process Tree Fetch (frontend):**

1. `useProcessTree` hook calls `GET /api/processes`
2. `processes` router returns `app.state.process_tree` directly as JSON
3. React Query caches with `staleTime: Infinity` — fetched once per session

**Annotation Read (example: classifications):**

1. Component calls `useClassifications()` hook
2. Hook calls `GET /api/classifications` via `apiFetch`
3. `classifications` router calls `read_md_file("classifications.md")` → returns `(frontmatter, body)`
4. `parse_md_table(body, "Classifications")` extracts rows as `list[dict]`
5. Rows converted to `list[Classification]` Pydantic models and returned as JSON

**Annotation Write (example: classification update):**

1. Component calls `useUpdateClassification` mutation
2. Hook sends `PUT /api/classifications/{node_id}` with JSON body
3. Router validates node exists in `app.state.process_tree` via `find_node()`
4. Reads current `classifications.md`, parses table, upserts row, re-serialises table
5. `write_md_file()` writes YAML frontmatter + body back to disk atomically
6. React Query invalidates `['classifications']` cache → UI refetches

**Chat Flow:**

1. Component sends `POST /api/chat` with `{provider, model, messages}`
2. Router builds system prompt: full process tree (compact `id: name` lines, cached in `_tree_context_cache`) + live state summary from `classifications.md` and `tag_assignments.md`
3. `stream_chat()` calls Anthropic SDK or OpenRouter via SSE
4. Response streamed back as `text/event-stream` with `data: {"chunk": "..."}` frames

**State Management:**
- Navigation state (active domain, drill path, detail node) in Zustand `useNavigationStore` — no persistence
- Filter state (category/review/tag/team filters) in Zustand `useFilterStore` — no persistence
- Server state in React Query — cache invalidated on mutations

## Key Abstractions

**ProcessNode:**
- Purpose: Single process node from the eTOM hierarchy; used for both parser output and API responses
- Examples: `backend/app/models.py` (Pydantic), `frontend/src/types/process.ts` (TypeScript interface)
- Pattern: Recursive tree — `children: list[ProcessNode]` (Python) / `children: ProcessNode[]` (TypeScript)

**Persistence (read_md_file / write_md_file):**
- Purpose: Treat Markdown files as a document store; frontmatter = metadata, body = Markdown table(s)
- Examples: `backend/app/persistence.py`
- Pattern: Every annotation file has `---\nYAML\n---\n\n## Section\n\n| col | ... |` structure. `parse_md_table(body, section)` returns `list[dict[str, str]]`; `write_md_table(rows, columns)` renders back to Markdown

**apiFetch:**
- Purpose: Typed HTTP client with consistent error handling and `/api` prefix
- Examples: `frontend/src/api/client.ts`
- Pattern: `apiFetch<T>(path)` — single generic function used by every React Query hook

**useNavigationStore (drillPath):**
- Purpose: Track the user's drill-down position in the process tree
- Examples: `frontend/src/store/navigation.ts`
- Pattern: `drillPath` is an array of selected node IDs indexed by depth below L1. `selectNode(id, level)` truncates the array at `level - 1` then appends `id`

## Entry Points

**Backend:**
- Location: `backend/app/main.py`
- Triggers: `uvicorn app.main:app`
- Responsibilities: Creates FastAPI app, runs `parse_excel()` + `ensure_data_files()` at startup, registers all routers under `/api` prefix, adds CORS middleware

**Frontend:**
- Location: `frontend/src/main.tsx`
- Triggers: Vite dev server or built HTML/JS bundle
- Responsibilities: Mounts React root, wraps in `QueryClientProvider`, renders `<App />`

**Frontend Root:**
- Location: `frontend/src/App.tsx`
- Triggers: Rendered by `main.tsx`
- Responsibilities: Orchestrates layout, owns modal state, resolves active domain + detail node from tree

## Error Handling

**Strategy:** HTTP exceptions in routers; fetch errors propagated in React Query; LLM errors streamed as SSE error events

**Patterns:**
- Routers raise `HTTPException(status_code=404)` when a node ID is not found in the tree
- `apiFetch` throws `Error("API error {status}: ...")` on non-OK HTTP responses
- React Query surfaces errors via `isError` / `error` fields in hook results
- Chat/LLM errors are caught in `_sse_stream()` and sent as `data: {"error": "..."}` followed by `data: {"done": true}` — client handles gracefully

## Cross-Cutting Concerns

**Logging:** Python `logging` module in `parser.py`; warnings for skipped/unresolvable nodes during Excel parsing. No structured logging.

**Validation:** Pydantic models validate all API request/response bodies. Node existence validated against `app.state.process_tree` before any write. No frontend form validation beyond TypeScript types.

**Authentication:** None. CORS allows all origins. `allow_credentials=False` is set. All endpoints are publicly accessible.

---

*Architecture analysis: 2026-04-22*
