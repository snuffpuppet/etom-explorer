# Testing Patterns

**Analysis Date:** 2026-04-22

## Test Framework

**Runner:**
- No frontend test framework installed — `package.json` has no test runner dependency (no Jest, Vitest, Cypress, Playwright)
- Backend: no pytest or unittest framework configured — tests are standalone Python scripts run directly with the interpreter

**Run Commands:**
```bash
# Backend — parser integration test
cd backend && python test_parser.py

# Backend — persistence layer self-test
cd backend && python app/persistence.py

# Frontend — type-check only (no test runner)
cd frontend && npm run build    # tsc + vite build; fails on type errors
```

## Test File Organization

**Backend:**
- `backend/test_parser.py` — standalone integration script at the backend root
- `backend/app/persistence.py` — self-test in `if __name__ == "__main__":` block at bottom of the module

**Frontend:**
- No test files exist
- No `__tests__/` directory or `*.test.*` / `*.spec.*` files anywhere in `frontend/src/`

## Test Structure

**Backend parser test (`backend/test_parser.py`):**

```python
def main():
    roots = parse_excel(EXCEL_PATH)

    # --- Assertion 1: exactly 8 domain root nodes ---
    assert len(roots) == 8, f"Expected 8 domain roots, got {len(roots)}: {root_ids}"
    print(f"✓ Domain root nodes ({len(roots)}): {[n.name for n in roots]}")

    # --- Assertion 2: total node count > 2800 ---
    total = count_nodes(roots)
    assert total > 2800, f"Expected >2800 total nodes, got {total}"
    print(f"✓ Total node count: {total}")

    # --- Assertion 3: multi-VG processes capture all vertical groups ---
    node_1114 = find_node(roots, "1.1.14")
    assert node_1114 is not None, "Could not find process 1.1.14"
    assert len(node_1114.vertical_groups) >= 2, ...
    print(f"✓ Multi-VG process 1.1.14 has groups: {node_1114.vertical_groups}")

if __name__ == "__main__":
    main()
```

**Persistence self-test (`backend/app/persistence.py` `__main__` block):**

```python
if __name__ == "__main__":
    import tempfile
    os.environ["DATA_DIR"] = tempfile.mkdtemp()

    ensure_data_files()
    fm, body = read_md_file("classifications.md")
    assert fm["version"] == 1, f"Expected version 1, got {fm.get('version')}"
    rows = parse_md_table(body, "Classifications")
    assert rows == [], f"Expected [], got {rows}"
    # Write a row and read it back
    rows = [{"id": "1.1.1", "name": "Test", ...}]
    table_str = write_md_table(rows, [...])
    write_md_file("classifications.md", {"version": 1}, "## Classifications\n\n" + table_str)
    fm2, body2 = read_md_file("classifications.md")
    rows2 = parse_md_table(body2, "Classifications")
    assert len(rows2) == 1 and rows2[0]["id"] == "1.1.1", f"Got: {rows2}"
    print("✅ persistence.py self-test passed")
```

**Patterns:**
- Assertions use Python `assert` with descriptive f-string failure messages
- Each assertion block is preceded by a `# --- Description ---` comment
- `print(f"✓ ...")` confirms each passing assertion to stdout
- No setup/teardown classes — flat `main()` function with sequential assertions
- Persistence test uses `tempfile.mkdtemp()` to isolate from real data directory

## Mocking

**Framework:** None — no mocking library used

**Patterns:**
- Persistence self-test isolates via real temp directory (`tempfile.mkdtemp()`) rather than mocking filesystem calls
- Parser test reads real Excel file from a hardcoded absolute path (`/Users/adam/projects/etom-explorer/docs/...`)
- No HTTP mocking for frontend (no test framework installed)

**What is tested without mocking:**
- Real filesystem reads/writes via actual `DATA_DIR` temp directory
- Real Excel file parsing

## Fixtures and Factories

**Test Data:**
- Parser test uses the real production Excel file; no synthetic fixtures
- Persistence test constructs inline row dictionaries:
  ```python
  rows = [{"id": "1.1.1", "name": "Test", "category": "oss", "review_status": "unreviewed", "notes": ""}]
  ```
- No shared fixture files or factories

**Location:**
- No dedicated fixtures directory

## Coverage

**Requirements:** None enforced — no coverage tooling configured

**View Coverage:**
- Not available; no coverage runner installed

## Test Types

**Unit Tests:**
- `app/persistence.py` self-test covers: file creation, YAML frontmatter round-trip, Markdown table write/parse round-trip
- Scope: single-module, real filesystem (temp dir)

**Integration Tests:**
- `test_parser.py` covers: Excel parsing produces correct tree shape, node counts, and multi-vertical-group data
- Scope: real Excel file → `ProcessNode` tree; depends on external file at hardcoded path

**E2E Tests:**
- Not used

**API Tests:**
- Not present — no FastAPI TestClient usage anywhere

## Common Patterns

**Async Testing:**
- Not applicable — no async tests; backend tests are synchronous scripts

**Error Testing:**
- Not tested — no assertion on error paths or exception handling

**Output format:**
```python
print(f"✓ Assertion label: {details}")   # passing assertion
print("✅ module self-test passed")        # final success line
```

## Gaps and Notes

- **Frontend has zero tests.** CLAUDE.md explicitly notes this. No test runner is installed.
- **Parser test requires real Excel file** at a hardcoded absolute path (`/Users/adam/projects/etom-explorer/docs/...`). This will fail in CI or on another developer's machine without adjustment.
- **No API-layer tests** — router logic (CRUD operations, validation, cascade deletion) is entirely untested.
- **No pytest** — adding pytest would allow parametrised tests, fixtures, and `conftest.py`-based setup without modifying the existing scripts.
- When adding frontend tests, the existing `package.json` scripts section has no `test` command — Vitest is the natural choice given the Vite build setup.

---

*Testing analysis: 2026-04-22*
