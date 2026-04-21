# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

eTOM Explorer is a tool for exploring and annotating the TM Forum GB921 eTOM Business Process Framework. The Excel file (`GB921_Business_Process_Framework_Processes_Excel_v25.5.xlsx`) is parsed at backend startup into an in-memory tree — it is never modified. All user annotations (classifications, tags, teams, notes, value streams) are persisted as Markdown files with YAML frontmatter in `./data/`.

## Architecture

```
frontend/   React + Vite + TypeScript (port 3000 in dev, 80 in Docker)
backend/    FastAPI + Python (port 8000)
data/       Markdown persistence files (Docker-mounted volume)
```

**Backend:**
- `app/parser.py` — Parses the Excel sheet `eTOM25,5` into a tree of `ProcessNode`. L0/L1 nodes are synthesised (not in the sheet); L2–L7 come from the data. Tree is stored in `app.state.process_tree` at startup.
- `app/persistence.py` — All reads/writes go through `read_md_file`/`write_md_file`/`parse_md_table`/`write_md_table`. Data files are Markdown with YAML frontmatter and tables under `## Section` headings.
- `app/routers/` — One file per domain: `processes`, `classifications`, `descoped`, `tags`, `teams`, `search`, `chat`, `llm`, `notes`, `value_streams`, `export`.
- `app/models.py` — All Pydantic models. `ProcessNode` is shared between parser output and API responses.

**Frontend:**
- `src/App.tsx` — Root layout. Owns modal open/close state (TagManager, ChatPanel, ExportDialog). Uses Zustand `useNavigationStore` for active domain, drill path, and detail node.
- `src/store/navigation.ts` — Zustand store. `drillPath` is an array of selected node IDs at each level below L1.
- `src/api/client.ts` — Single `apiFetch<T>` wrapper. All API calls use `/api` prefix proxied to `:8000` in dev.
- `src/hooks/` — React Query hooks per resource (`useProcessTree`, `useClassifications`, `useTags`, `useValueStreams`, `useNotes`).
- `src/components/` — Flat directory; components are colocated with no subdirectory nesting.

**Process ID conventions:**
- L0: `L0-OPS`, `L0-SIP`, `L0-ENT`
- L1: `L1-Customer`, `L1-Service`, etc.
- L2+: dotted numeric IDs from the Excel (e.g. `1.2.3.4`)

**Persistence file layout** (`data/`):
- `classifications.md`, `descoped.md`, `tags.md`, `tag_assignments.md`, `teams.md`, `value-streams.md` — Markdown tables
- `notes/<safe_id>.md` — Per-node freeform notes (`.` and `/` in IDs become `_`)

## Development

### Running locally (without Docker)

**Backend:**
```bash
cd backend
pip install -r requirements.txt
EXCEL_PATH=../docs/GB921_Business_Process_Framework_Processes_Excel_v25.5.xlsx \
  DATA_DIR=../data \
  uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev   # starts on :5173, proxies /api → :8000
```

### Running with Docker
```bash
docker compose up --build
# frontend → http://localhost:3000
# backend  → http://localhost:8000
```

### Frontend type-check + build
```bash
cd frontend
npm run build   # tsc + vite build
```

### Backend self-tests
```bash
cd backend
python app/persistence.py      # self-test for persistence layer
python test_parser.py          # parser tests
```

## Key Constraints

- The Excel file path is configured via `EXCEL_PATH` env var (default: `/app/data_source/...`). The backend will fail to start if the file is missing.
- `DATA_DIR` env var controls where Markdown data files are written (default: `/app/data`). In Docker this is volume-mounted from `./data`.
- No authentication is implemented. CORS allows all origins.
- No frontend test suite exists yet.
