# External Integrations

**Analysis Date:** 2026-04-22

## APIs & External Services

**LLM Providers (both optional, one required for chat/seeding features):**

- Anthropic Claude API - Streaming chat and classification seeding
  - SDK/Client: `anthropic` Python package (`app/llm/client.py`)
  - Auth: `ANTHROPIC_API_KEY` environment variable
  - Models: `claude-opus-4-6`, `claude-sonnet-4-6`, `claude-haiku-4-5-20251001`
  - Usage: `anthropic.AsyncAnthropic` with `client.messages.stream()`, max 8192 tokens
  - Endpoints: `POST /api/chat` (SSE streaming), `POST /api/llm/seed`, `GET /api/llm/seed/status`

- OpenRouter API - Alternative multi-model provider
  - SDK/Client: `httpx` async HTTP streaming (`app/llm/client.py`)
  - Auth: `OPENROUTER_API_KEY` environment variable
  - URL: `https://openrouter.ai/api/v1/chat/completions`
  - Models: `anthropic/claude-opus-4-6`, `anthropic/claude-sonnet-4-6`, `google/gemini-2.5-pro`, `openai/gpt-4o`
  - Headers: `HTTP-Referer: http://localhost:3000`, `X-Title: eTOM Explorer`
  - Timeout: 120 seconds

**Provider selection:**
- Client selects provider (`"claude"` or `"openrouter"`) and model per request via `ChatRequest.provider` + `ChatRequest.model`
- `GET /api/llm/models?provider=claude` returns available model list per provider

## Data Storage

**Databases:**
- None. No external database used.

**Flat-file Persistence:**
- All user data stored as Markdown files with YAML frontmatter in `DATA_DIR` (default: `./data/`)
- Controlled entirely by `backend/app/persistence.py`
- Tables stored under `## Section` headings in Markdown:
  - `data/classifications.md` - Process classification records
  - `data/descoped.md` - Descoped process records
  - `data/tags.md` - Tag definitions
  - `data/tag_assignments.md` - Tag-to-node assignments
  - `data/teams.md` - Team assignments
  - `data/value-streams.md` - Value stream definitions
- Per-node freeform notes stored as individual files: `data/notes/<safe_id>.md`
  - Safe IDs: `.` and `/` in process IDs replaced with `_`

**Source Data (read-only):**
- TM Forum GB921 Excel file (`docs/GB921_Business_Process_Framework_Processes_Excel_v25.5.xlsx`)
- Parsed once at startup via `openpyxl` into in-memory tree (`app.state.process_tree`)
- Sheet name: `eTOM25,5`
- Never modified by the application

**File Storage:**
- Local filesystem only. Docker volume-mounts `./data` into backend container.

**Caching:**
- In-memory only: `_tree_context_cache` in `app/routers/chat.py` caches the formatted process tree string (avoids re-walking ~2900 nodes per chat request)

## Authentication & Identity

**Auth Provider:**
- None. No authentication implemented.
- CORS: `allow_origins=["*"]`, all methods and headers permitted (`app/main.py`)

## Monitoring & Observability

**Error Tracking:**
- None configured.

**Logs:**
- Uvicorn access logs only (standard stdout). No application-level structured logging.

## CI/CD & Deployment

**Hosting:**
- Docker Compose (self-hosted). Two containers: `backend` and `frontend`.
- Frontend served via nginx:alpine (static files + `/api/` reverse proxy to backend).

**CI Pipeline:**
- None detected.

## Environment Configuration

**Required env vars for full functionality:**
- `ANTHROPIC_API_KEY` - Required if using `provider=claude` (chat or seeding)
- `OPENROUTER_API_KEY` - Required if using `provider=openrouter`
- `EXCEL_PATH` - Path to eTOM Excel file (backend crashes at startup if missing)
- `DATA_DIR` - Markdown data directory (defaults work in Docker, override for local dev)

**Secrets location:**
- `.env` file at repo root (referenced by `docker-compose.yml` via `env_file: .env`)
- `.env` file is gitignored

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None (all LLM calls are client-initiated request/response or SSE streams)

## Frontend API Communication

**Internal only:**
- Frontend communicates exclusively with the backend `/api` prefix
- Dev: Vite proxy at `frontend/vite.config.ts` forwards `/api` → `http://localhost:8000`
- Prod: nginx reverse proxy at `frontend/nginx.conf` forwards `/api/` → `http://backend:8000/api/`
- Single fetch wrapper: `frontend/src/api/client.ts` (`apiFetch<T>`)
- Chat SSE stream: frontend connects to `POST /api/chat`, reads `text/event-stream` directly via `fetch` (not wrapped in `apiFetch`)

---

*Integration audit: 2026-04-22*
