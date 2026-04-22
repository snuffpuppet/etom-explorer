# Technology Stack

**Analysis Date:** 2026-04-22

## Languages

**Primary:**
- TypeScript 5.4 - Frontend (all React components, hooks, API client)
- Python 3.12 - Backend (FastAPI application, parser, persistence layer)

**Secondary:**
- CSS (via Tailwind utility classes) - Styling

## Runtime

**Environment:**
- Node.js 20 (Alpine) - Frontend build and dev server
- Python 3.12 (Debian slim) - Backend API server

**Package Manager:**
- npm - Frontend
- pip - Backend
- Lockfile: `frontend/package-lock.json` present

## Frameworks

**Core (Frontend):**
- React 18.3 - UI framework
- Vite 5.3 - Build tool and dev server (with `/api` proxy to `:8000`)
- Zustand 4.5 - Client-side state management (`src/store/navigation.ts`)
- TanStack React Query 5.45 - Server state and data fetching (`src/hooks/`)
- Tailwind CSS 3.4 - Utility-first styling

**Core (Backend):**
- FastAPI 0.111+ - REST API framework with async support
- Uvicorn (standard) 0.29+ - ASGI server

**Build/Dev:**
- `@vitejs/plugin-react` 4.3 - React Fast Refresh in dev
- TypeScript compiler (tsc) - Type checking before build
- PostCSS + autoprefixer - CSS processing for Tailwind

## Key Dependencies

**Critical (Backend):**
- `openpyxl` 3.1+ - Parses the eTOM Excel source file at startup (`app/parser.py`)
- `pyyaml` 6.0+ - YAML frontmatter in all persistence Markdown files (`app/persistence.py`)
- `anthropic` 0.28+ - Anthropic SDK for Claude API streaming (`app/llm/client.py`)
- `httpx` 0.27+ - Async HTTP client for OpenRouter API streaming (`app/llm/client.py`)
- `python-multipart` 0.0.9+ - Required by FastAPI for form data parsing

**Critical (Frontend):**
- `react` / `react-dom` 18.3 - Core UI
- `@tanstack/react-query` 5.45 - Query caching and invalidation for all API calls
- `zustand` 4.5 - Navigation state: active domain, drill path, detail node

## Configuration

**Environment (Backend):**
- `EXCEL_PATH` - Path to eTOM Excel source file (default: `/app/data_source/GB921_Business_Process_Framework_Processes_Excel_v25.5.xlsx`)
- `DATA_DIR` - Path to Markdown persistence directory (default: `/app/data`)
- `ANTHROPIC_API_KEY` - Required for Claude direct provider
- `OPENROUTER_API_KEY` - Required for OpenRouter provider
- Loaded via `.env` file in Docker (`docker-compose.yml` uses `env_file: .env`)

**Build (Frontend):**
- `frontend/vite.config.ts` - Vite config with `/api` proxy
- `frontend/tsconfig.json` - TypeScript strict mode, ES2020 target, bundler module resolution
- `frontend/tailwind.config.js` - Scans `./index.html` and `./src/**`
- `frontend/postcss.config.js` - PostCSS with Tailwind and autoprefixer

## Platform Requirements

**Development:**
- Node.js 20+ for frontend
- Python 3.12+ for backend
- Frontend dev server: `:5173` (Vite), proxies `/api` → `:8000`
- Backend dev server: `:8000` (uvicorn --reload)
- Excel source file must be present at `EXCEL_PATH` — backend fails to start without it

**Production (Docker):**
- `docker compose up --build` (context: repo root)
- Frontend: nginx:alpine serving static build on `:80` (host `:3000`)
- Backend: python:3.12-slim on `:8000`
- `./data/` volume-mounted into backend container at `/app/data`
- Excel file baked into backend image at build time (`docs/` → `/app/data_source/`)

---

*Stack analysis: 2026-04-22*
