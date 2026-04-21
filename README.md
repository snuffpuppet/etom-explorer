# eTOM Explorer

A tool for exploring and annotating the [TM Forum GB921 eTOM Business Process Framework](https://www.tmforum.org/oda/business-architecture/etom-business-process-framework/). Browse the full process hierarchy, classify processes, assign tags and teams, map value streams, and export annotated views.

## Prerequisites

### 1. Download the eTOM Excel file

The backend parses the GB921 spreadsheet at startup — it is never modified, only read. You must obtain it from TM Forum before the application will start.

1. Go to [GB921 Business Process Framework Processes Excel v25.5](https://www.tmforum.org/resources/standard/gb921-business-process-framework-processes-excel-v25-5/) (free registration required)
2. Download the file and place it at:

```
docs/GB921_Business_Process_Framework_Processes_Excel_v25.5.xlsx
```

> The default Docker configuration expects the file at `docs/` in the repo root. If you place it elsewhere, set the `EXCEL_PATH` env var accordingly.

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and set at least one API key if you want to use the Chat feature:

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Direct Claude API access |
| `OPENROUTER_API_KEY` | OpenRouter (Claude, Gemini, GPT-4o, etc.) |

## Running with Docker (recommended)

Requires [Docker](https://docs.docker.com/get-docker/) and Docker Compose.

```bash
docker compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |

Annotation data (tags, classifications, notes, etc.) is persisted to `./data/` as Markdown files and survives container restarts.

## Running locally (without Docker)

### Backend

```bash
cd backend
pip install -r requirements.txt

EXCEL_PATH=../docs/GB921_Business_Process_Framework_Processes_Excel_v25.5.xlsx \
  DATA_DIR=../data \
  uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev   # http://localhost:5173, proxies /api → :8000
```

## Architecture

```
frontend/   React + Vite + TypeScript
backend/    FastAPI + Python
data/       Markdown annotation files (git-trackable, Docker volume-mounted)
docs/       Source Excel file (not committed — download separately)
```

- The Excel file is parsed once at startup into an in-memory process tree. All annotations are stored separately in `data/` as Markdown files with YAML frontmatter.
- The frontend uses React Query for data fetching and Zustand for navigation state.
- No authentication is implemented; CORS allows all origins.

## LLM Chat Feature

The chat panel provides a conversational interface for exploring the eTOM framework in the context of your specific annotations and classifications.

### How it works

Each chat request sends a single-turn call to the configured LLM — there is no agentic loop or tool use. The model receives a system prompt containing:

1. **Full process tree** — all ~2,900 nodes from the parsed Excel file, formatted as indented `id: name` lines (descriptions omitted to stay within context limits)
2. **Current annotation state** — a compact snapshot of your classifications (counts plus all non-default entries) and tag assignments, capped at ~2,000 characters
3. **Role framing** — the model is prompted as an eTOM expert focused on OSS/BSS replatforming analysis

The conversation history (prior turns) is sent with each request so the model has multi-turn context, but no state is stored on the server between requests.

Process IDs in responses are formatted as `[Process: X.X.X]` — the frontend renders these as clickable links that navigate directly to that node in the tree.

### Supported providers and models

| Provider | Models |
|---|---|
| Claude (direct) | Opus 4, Sonnet 4, Haiku 4 |
| OpenRouter | Claude, Gemini 2.5 Pro, GPT-4o |

Select the provider and model in the chat panel header. Responses stream over SSE.

### How authoritative is it on the eTOM Excel file?

**Moderately authoritative, with important caveats.**

The model sees the complete node hierarchy (IDs and names) from the actual Excel file you downloaded, so it can accurately reference the structure — which processes exist, how they nest, and what their IDs are. When it cites `[Process: 1.4.5]`, that ID corresponds to a real node in your parsed tree.

What it does **not** have access to:

- **Process descriptions** — these are stripped from the context to keep the prompt within token limits. The model falls back on its training knowledge for descriptions, which may lag behind v25.5 specifics.
- **Your notes** — per-node freeform notes are not included in the chat context.
- **Value streams** — value stream assignments are not currently included in the state snapshot.

The underlying LLM also has general eTOM knowledge from training data, which may reflect earlier framework versions. For precise definitional questions, treat the model as a knowledgeable guide rather than an authoritative source — cross-check against the Excel file or TM Forum documentation for anything consequential.

## Development

### Type-check and build frontend

```bash
cd frontend
npm run build
```

### Backend self-tests

```bash
cd backend
python app/persistence.py   # persistence layer self-test
python test_parser.py       # parser tests
```
