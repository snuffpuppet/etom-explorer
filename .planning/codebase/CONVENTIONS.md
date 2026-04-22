# Coding Conventions

**Analysis Date:** 2026-04-22

## Naming Patterns

**Files:**
- React components: PascalCase matching exported function name — `ProcessTile.tsx`, `TagBadge.tsx`, `TreeView.tsx`
- Hooks: camelCase with `use` prefix — `useProcessTree.ts`, `useClassifications.ts`, `useTags.ts`
- Stores: camelCase with `use` prefix, suffix `Store` — `navigation.ts` exports `useNavigationStore`, `filters.ts` exports `useFilterStore`
- Types: camelCase module name — `process.ts`, `classification.ts`, `tags.ts`
- Backend routers: snake_case module name — `classifications.py`, `value_streams.py`, `tag_assignments.py`
- Backend models: PascalCase class name — `ProcessNode`, `ClassificationUpdate`, `TagAssignmentUpdate`

**Functions / Hooks:**
- Frontend: camelCase — `apiFetch`, `useProcessTree`, `useUpdateNodeTags`, `buildNodeMap`
- Backend: snake_case — `parse_excel`, `read_md_file`, `find_node`, `_collect_ancestors`
- Private helpers prefixed with `_` in Python — `_read_defs`, `_write_defs`, `_normalise_domain`, `_get_data_dir`
- Private helpers prefixed with `_` in router modules for read/write pairs — `_read_assignments`, `_write_assignments`

**Variables:**
- TypeScript: camelCase — `tagDefs`, `nodeAssignments`, `classificationsMap`, `drillPath`
- Python: snake_case — `tag_id`, `node_id`, `review_status`, `process_ids`

**Types / Interfaces:**
- TypeScript: PascalCase `interface` or `type` alias — `ProcessNode`, `TagDef`, `FilterParams`, `Visibility`
- Python: Pydantic `BaseModel` subclasses in PascalCase — `TagDef`, `ClassificationUpdate`
- `Literal` type aliases for enums in both languages: `CategoryType`, `ReviewStatusType` (Python), `Category`, `ReviewStatus` (TypeScript)

**Constants:**
- TypeScript: SCREAMING_SNAKE_CASE for lookup maps/records exported from type files — `CATEGORY_COLOURS`, `CATEGORY_LABELS`, `REVIEW_STATUS_LABELS`, `VG_CHIP`
- Python: SCREAMING_SNAKE_CASE for module-level constants — `DOMAIN_DEFINITIONS`, `DOMAIN_TO_ROOT_ID`, `DEFS_FILE`, `ASSIGN_SECTION`

## Code Style

**Formatting:**
- No `.prettierrc` or `.eslintrc` detected at project root — no automated formatter enforced
- TypeScript: uses `strict: true` in `tsconfig.json`; target `ES2020`
- Indentation: 2 spaces (TypeScript/TSX); 4 spaces (Python)
- Trailing commas: present in TypeScript multi-line arrays/objects
- Single quotes for strings in TypeScript; double quotes in Python

**Linting:**
- No ESLint config found at project root — linting is not enforced in CI
- TypeScript compiler (`tsc`) serves as the primary static check via `npm run build`
- Python: no linter config detected; `# noqa: E402` comment used in `app/main.py` for unavoidable import order

## Import Organization

**TypeScript order (observed pattern):**
1. React built-ins — `import { useState, useMemo } from 'react'`
2. Third-party libraries — `import { useQuery, useMutation } from '@tanstack/react-query'`
3. Internal types (using `import type`) — `import type { ProcessNode } from '../types/process'`
4. Internal hooks — `import { useProcessTree } from '../hooks/useProcessTree'`
5. Internal components — `import { TagBadge } from './TagBadge'`
6. Internal stores — `import { useNavigationStore } from '../store/navigation'`
7. Internal API/utils — `import { apiFetch } from '../api/client'`

**`import type` usage:**
- Always use `import type` for pure type imports — `import type { TagDef }` vs `import { TagDef }` (when value is needed at runtime)
- This pattern is consistent across all hook and component files

**Path Aliases:**
- No path aliases configured — all imports use relative paths (`../types/`, `./TagBadge`, `../hooks/`)

**Python order:**
1. Standard library (`os`, `re`, `yaml`, `datetime`, `pathlib`)
2. Third-party (`fastapi`, `openpyxl`, `pydantic`)
3. Internal app modules (`from app.models import ...`, `from app.persistence import ...`, `from app.utils import ...`)

## Error Handling

**Frontend patterns:**
- `apiFetch` throws on non-OK response: `throw new Error(\`API error ${res.status}: ${await res.text()}\`)`
- React Query propagates errors to `isError` state — components check `isError` and render inline error messages (e.g. `"Failed to load process tree."`)
- No global error boundary present — individual `isError` checks per data-dependent view
- Default empty arrays for optional query data: `const { data: tagDefs = [] } = useTags()`
- Mutation errors are not currently surfaced to the user (no `onError` handlers in mutation hooks)

**Backend patterns:**
- `HTTPException` raised directly in router functions for 404/409: `raise HTTPException(status_code=404, detail=f"...")`
- `FileNotFoundError` raised in parser if Excel path missing
- Persistence functions return empty defaults on missing files — `read_md_file` returns `({}, "")` for missing files
- No custom exception classes — standard FastAPI/Python exceptions used throughout
- `unquote()` applied to all path parameters at the start of router handlers

## Logging

**Backend:**
- `logging.getLogger(__name__)` used in `app/parser.py`
- Print statements (`print(...)`) used in self-test scripts (`persistence.py`, `test_parser.py`) and seed scripts
- No structured logging framework

**Frontend:**
- No logging framework; `console.*` not observed in component code
- React Query DevTools not installed

## Comments

**When to Comment:**
- Inline comments explain non-obvious business logic and data quirks — e.g. ID collision notes in `persistence.py`, Excel column mapping in `parser.py`
- Section dividers used in longer files with `# ---` or `# ──` style banners (TypeScript hooks use `// ── Tag definitions ──────────`)
- JSDoc/docstrings on module-level functions in Python: `"""Read a Markdown file with YAML frontmatter..."""`
- Inline `# e.g. ...` notes on model fields for ID conventions

**React components:**
- JSX section comments using `{/* Process name */}` blocks within render returns
- Explanatory comments on `TODO` / known limitations placed inline

## Function Design

**Size:**
- Frontend hooks are small, single-purpose (5–20 lines); heavier logic lives in components or utility functions
- Router handlers are kept thin — delegate to persistence helpers and `find_node`
- Complex filter logic extracted into named helper functions (`nodeMatchesFilters`, `getVisibility`, `hasMatchingDescendant`) in `TreeView.tsx`

**Parameters:**
- Props interfaces defined as local `interface` immediately above the component function
- Mutation `mutationFn` parameters destructure inline: `({ id, ...body }: { id: string; ... })`
- Python functions use keyword-style defaults on Pydantic fields rather than overloaded signatures

**Return Values:**
- React Query hooks always return the full query/mutation object — callers destructure what they need
- Python router handlers return Pydantic model instances directly; FastAPI serialises via `response_model`

## Module Design

**Exports (TypeScript):**
- Named exports only — no default exports from components, hooks, or stores
- Exception: `App` component in `src/App.tsx` uses `export default App` (entry point)
- One export per file for components; hooks files export multiple related hooks (e.g. `useTags.ts` exports tag, assignment, team, and search hooks grouped by domain)

**Barrel Files:**
- No barrel `index.ts` files — imports always reference the specific file path

**Backend routers:**
- Each router file exposes a single `router = APIRouter()` instance
- Module-level constants define file paths, section names, and column lists — not scattered inline

## State Management Patterns

**Zustand stores:**
- State interface defined as a TypeScript `interface` immediately above `create<...>()` call
- Actions co-located in the same store object — no separate action creators
- `set((state) => ...)` pattern for derived updates; `set({ ... })` for direct replacement
- Two stores: `useNavigationStore` (`src/store/navigation.ts`) and `useFilterStore` (`src/store/filters.ts`)

**React Query:**
- `queryKey` arrays use kebab-case strings — `['process-tree']`, `['tag-assignments']`, `['value-streams']`
- Node-scoped queries include the `nodeId` as a second key element — `['notes', nodeId]`
- `staleTime: Infinity` for static data (process tree, value streams); `staleTime: 0` for user-editable data
- `onSuccess: () => qc.invalidateQueries(...)` pattern for cache invalidation after mutations
- Cross-resource invalidation (e.g. delete tag also invalidates `tag-assignments`) done in the same `onSuccess`

## Tailwind CSS Conventions

- All styling via Tailwind utility classes directly in JSX — no CSS modules or styled-components
- Dynamic class composition using array join: `[cls1, cls2, condition ? 'x' : ''].filter(Boolean).join(' ')`
- Inline `style` attribute only for dynamic values that Tailwind can't express (e.g. `style={{ backgroundColor: colour + '33', color: colour }}` for user-defined tag colours)
- Dark-first design: `bg-gray-950`, `text-white`, `text-gray-400` as base colours

---

*Convention analysis: 2026-04-22*
