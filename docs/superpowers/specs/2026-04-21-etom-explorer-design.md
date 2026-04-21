# eTOM Explorer — Design Spec

**Date:** 2026-04-21  
**Status:** Approved for planning

---

## Purpose

An interactive visual exploration tool for the TMForum GB921 eTOM (enhanced Telecom Operations Map) process framework, built to support an OSS replatforming project where the BSS remains unchanged.

The tool serves three functions:
1. **Learning** — understand the eTOM hierarchy and what each process does
2. **Classification** — label processes by OSS/BSS relevance, tag them, and descope what's not needed
3. **Documentation** — produce requirements gathering artefacts (new, changing, no longer needed) for Confluence

Source data: `GB921_Business_Process_Framework_Processes_Excel_v25.5.xlsx` in the project root.

---

## Architecture

**Docker Compose — two containers:**

- **frontend**: React/TypeScript (Vite) built and served by nginx on port 3000. nginx proxies `/api/*` to the backend.
- **backend**: Python/FastAPI on port 8000. Handles Excel parsing, LLM proxying, and Markdown file persistence.

**Volume mount:** `./data` → `/app/data` on the backend container. All user state lives here.

**Repository structure:**
```
etom-explorer/
  frontend/       # React/TypeScript app
  backend/        # Python/FastAPI app
  data/           # Markdown persistence (git-tracked, Obsidian vault)
  docker-compose.yml
```

---

## Data Model

### Process Tree (read-only reference)

Parsed from the Excel file on backend startup into an in-memory hierarchy:

```
ProcessNode {
  id: string           # e.g. "1.1.2.3"
  name: string
  description: string
  level: int           # 0 = domain, 1 = L1, 2 = L2, 3 = L3
  parent_id: string | null
  children: ProcessNode[]
}
```

### Classification Overlay (Markdown files, user-editable)

All files use YAML frontmatter + structured Markdown content.

| File | Purpose |
|---|---|
| `data/classifications.md` | OSS/BSS category + review status per process |
| `data/descoped.md` | Descoped process IDs with reasons |
| `data/tags.md` | Tag definitions (name, colour, description) |
| `data/tag-assignments.md` | Process → tags, with cascade flag |
| `data/value-streams.md` | Value stream → process ID mappings |
| `data/team-assignments.md` | Process → team:function associations |
| `data/settings.md` | App settings (LLM provider, model, preferences) |
| `data/notes/<id>.md` | Per-process notes (Obsidian-friendly) |

---

## OSS/BSS Classification

Each process is categorised into one of four classes, displayed as tile border colour:

| Category | Colour | Meaning |
|---|---|---|
| OSS | Green | Processes relating to OSS only |
| OSS/BSS | Blue | Processes that rely on both OSS and BSS |
| BSS | Orange | BSS-specific (e.g. party mgmt, contract mgmt) |
| Other | Grey | Does not fit the above — reason required |
| Descoped | Red | Not needed — reason required |

**LLM seeding:** On first run, Claude generates an initial OSS/BSS classification for all processes based on eTOM domain knowledge. Results are written to `data/classifications.md`. All items start as **Unreviewed** regardless of LLM seed.

---

## Review Status

Each process carries a review status independent of its classification:

| Status | Meaning |
|---|---|
| Unreviewed | Not yet considered (default) |
| Under Review | Started considering, no decision yet |
| Classified | Category confirmed with confidence |
| Descoped | Explicitly ruled out with a reason |

Shown as a subtle dot indicator on tiles. Filterable. Enables progressive classification workflows — the LLM seed gives a starting point, but review status tracks what you've personally validated.

---

## Team & Function Associations

Any process node (any level) can have one or more team:function pairs attached:

- Format: `Team Name: Function Description` (e.g. "Network Edge: CVC rebalancing")
- Multiple per node
- Stored in `data/team-assignments.md`
- Displayed on tiles as tags
- Filterable by team name

---

## UI Layout

### Top Bar
- App title
- Search box (text search across all processes, real-time)
- Value Streams view toggle
- Chat panel toggle

### Filter Bar (below top bar, always visible)
- **Classification**: OSS / OSS-BSS / BSS / Other toggles
- **Review status**: Unreviewed / Under Review / Classified filter
- **Descoped**: Show / Hide / Dim toggle
- **Tags**: Multi-select dropdown
- **Teams**: Filter by team name
- **Active filter chips**: Displayed below bar, click-to-remove

When filtering, if a parent is filtered out but a child matches, the parent shows as a muted breadcrumb to maintain hierarchy context.

### Domain Tabs
Domains (L0) are rendered as tabs below the filter bar. Active tab shows its full process tree.

Domains from GB921 v25.5:
- Strategy, Infrastructure & Product
- Operations
- Enterprise Management

### Tree View (main content area)

Each level of the hierarchy occupies its own horizontal row:

- **L1 row**: All L1 tiles for the active domain, full-width, scrollable
- **L2 row**: Children of the selected L1 tile, indented, connected by a vertical line
- **L3 row**: Children of the selected L2 tile, further indented

Clicking a tile at any level selects it and expands its children as the next row. Selecting a different sibling collapses and replaces the rows below.

**Tile content:**
- Process name
- Short description
- Classification colour (left border)
- Review status dot
- Child count + descoped count rollup
- Tags / team:function badges
- Automation level tag (user-assigned)

**Tile states:**
- **Selected**: highlight ring (blue)
- **Unselected siblings**: dimmed to 70% opacity
- **Descoped**: strikethrough name, red border, reduced opacity (hideable via filter)

Background darkens subtly at each nesting level to reinforce depth.

### Chat Panel

Slides in from the right side of the screen. Read-only — no state modifications.

**Capabilities:**
- Natural language process search
- Relationship and impact queries
- Classification guidance
- Grouping and descoping suggestions

**Context sent to LLM:** Full process hierarchy + current classifications, tags, descoping, team assignments, and review status.

**Results:** Processes mentioned in responses appear as clickable links that navigate the tree to that item.

**Model selector:** Dropdown in the chat panel header. Model list populated from the selected provider.

### Value Streams View

Alternative view toggled from the top bar. Reorganises processes by value stream rather than eTOM domain hierarchy. Same tile rendering, filtering, and review status apply. Processes can belong to multiple value streams.

---

## Value Streams

### Customer Value Streams
| Stream | Description |
|---|---|
| Prospect to Order | Marketing, qualification, offer, contract |
| Order to Activate | Order capture, service design, activation, delivery |
| Usage to Cash | Rating, charging, billing, collections |
| Problem to Resolution | Trouble reporting, diagnosis, repair, closure |
| Request to Change | Modification requests, upgrades, service changes |
| Terminate to Confirm | Disconnection, final billing, asset recovery |

### Operational Value Streams
| Stream | Description |
|---|---|
| Plan to Build | Network/service planning, design, deployment |
| Monitor to Resolve | Performance monitoring, fault detection, remediation |
| Procure to Operate | Supplier engagement, provisioning, lifecycle management |
| Insight to Improve | Analytics, reporting, continuous improvement |

**LLM seeding:** On first run, Claude generates an initial mapping of processes to value streams. Stored in `data/value-streams.md`. Editable via the UI.

---

## LLM Integration

### Providers
- **Claude API** (direct, via `ANTHROPIC_API_KEY`)
- **OpenRouter** (via `OPENROUTER_API_KEY`)

Configured via environment variable: `LLM_PROVIDER=claude|openrouter`

### Model Selection
Selected in the UI chat panel (persisted to `data/settings.md`). Provider determines the available model list. Examples: claude-opus-4-6, claude-sonnet-4-6, or OpenRouter equivalents.

### LLM Seeding Workflow
Triggered on first run or on-demand via a backend endpoint:
1. Parse full process tree from Excel
2. Send hierarchy to Claude with classification instructions
3. Write results to `data/classifications.md` and `data/value-streams.md`
4. All items remain **Unreviewed** until confirmed in UI

---

## Markdown Persistence Format

Example `data/classifications.md`:

```markdown
---
version: 1
generated: 2026-04-21
---

## Process Classifications

| id | name | category | review_status | notes |
|---|---|---|---|---|
| 1.1.1 | Strategy & Commit | oss_bss | unreviewed | LLM seed |
| 1.2.1 | Fulfillment | oss | classified | Confirmed |
```

Files are plain text, git-diffable, and readable in Obsidian as a vault. The `data/` directory should be the Obsidian vault root.

---

## Export & Requirements Documents

Export generates a Markdown summary document from current state, organised as:

1. **New processes** — processes required in the new OSS platform not currently automated
2. **Changing processes** — processes that exist but need to change
3. **No longer needed** — descoped processes with reasons

Includes: OSS/BSS category, automation level, team/function assignments, and any notes. Output as Markdown (Confluence-pasteable) or HTML.

---

## Deployment

### Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `LLM_PROVIDER` | No | `claude` | `claude` or `openrouter` |
| `ANTHROPIC_API_KEY` | If claude | — | Claude API key |
| `OPENROUTER_API_KEY` | If openrouter | — | OpenRouter key |
| `CLAUDE_MODEL` | No | `claude-sonnet-4-6` | Model ID |

### docker-compose.yml (outline)

```yaml
services:
  frontend:
    build: ./frontend
    ports: ["3000:80"]
    depends_on: [backend]

  backend:
    build: ./backend
    ports: ["8000:8000"]
    volumes:
      - ./data:/app/data
    environment:
      - LLM_PROVIDER
      - ANTHROPIC_API_KEY
      - OPENROUTER_API_KEY
      - CLAUDE_MODEL
```

### .gitignore additions needed
```
.superpowers/
```

---

## Verification

End-to-end test after implementation:

1. `docker compose up` — both containers start cleanly
2. Navigate to `http://localhost:3000` — tile tree view loads with eTOM hierarchy from Excel
3. Trigger LLM seeding — classifications and value streams written to `data/`
4. Drill down through domain → L1 → L2 → L3 — each level row appears correctly
5. Apply filters — classification, review status, descoped toggle all work
6. Mark an item as descoped with a reason — persists in `data/descoped.md`
7. Add a team:function association — persists in `data/team-assignments.md`
8. Open chat panel, ask a process question — response references clickable process links
9. Switch to Value Streams view — processes grouped by value stream
10. Export requirements document — Markdown file generated with three-category structure
