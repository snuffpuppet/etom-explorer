import os
import yaml
from datetime import datetime, timezone
from pathlib import Path

_DEFAULT_DATA_DIR = "/app/data"


def _get_data_dir() -> str:
    return os.environ.get("DATA_DIR", _DEFAULT_DATA_DIR)


def _data_path(filename: str) -> Path:
    return Path(_get_data_dir()) / filename


def read_md_file(filename: str) -> tuple[dict, str]:
    """Read a Markdown file with YAML frontmatter.
    Returns (frontmatter_dict, body_str).
    If file doesn't exist, returns ({}, "").
    """
    path = _data_path(filename)
    try:
        content = path.read_text(encoding="utf-8")
    except FileNotFoundError:
        return {}, ""

    # Split on '---' delimiters
    parts = content.split("---")
    # parts[0] is empty (before first ---), parts[1] is frontmatter, parts[2+] is body
    if len(parts) < 3:
        return {}, content

    frontmatter_str = parts[1]
    body = "---".join(parts[2:]).lstrip("\n")

    frontmatter = yaml.safe_load(frontmatter_str) or {}
    return frontmatter, body


def write_md_file(filename: str, frontmatter: dict, body: str) -> None:
    """Write a Markdown file with YAML frontmatter.
    Creates DATA_DIR if it doesn't exist.
    Automatically sets frontmatter['updated'] to current UTC ISO timestamp.
    """
    os.makedirs(_get_data_dir(), exist_ok=True)
    frontmatter = dict(frontmatter)
    frontmatter["updated"] = datetime.now(timezone.utc).isoformat()
    path = _data_path(filename)
    content = f"---\n{yaml.dump(frontmatter)}---\n\n{body}"
    path.write_text(content, encoding="utf-8")


def parse_md_table(body: str, section: str) -> list[dict[str, str]]:
    """Parse a Markdown table under a given section heading (e.g. "## Classifications").
    Returns list of row dicts keyed by column headers.
    Returns [] if section or table not found.
    """
    lines = body.splitlines()
    section_heading = f"## {section}"

    # Find the section heading
    section_idx = None
    for i, line in enumerate(lines):
        if line.strip() == section_heading:
            section_idx = i
            break

    if section_idx is None:
        return []

    # Scan lines below for a | table
    table_lines = []
    in_table = False
    for line in lines[section_idx + 1:]:
        stripped = line.strip()
        if stripped.startswith("|"):
            table_lines.append(stripped)
            in_table = True
        elif in_table:
            # End of table
            break

    if len(table_lines) < 2:
        return []

    # First line = headers, second = separator (skip), rest = data rows
    def parse_row(line: str) -> list[str]:
        inner = line.strip("|")
        return [cell.strip() for cell in inner.split("|")]

    headers = parse_row(table_lines[0])
    rows = []
    for line in table_lines[2:]:  # skip separator at index 1
        cells = parse_row(line)
        # Pad or truncate cells to match header count
        while len(cells) < len(headers):
            cells.append("")
        row = {headers[i]: cells[i] for i in range(len(headers))}
        rows.append(row)

    return rows


def write_md_table(rows: list[dict[str, str]], columns: list[str]) -> str:
    """Render a list of dicts as a Markdown table string.
    columns specifies the column order.
    Returns the table string (header + separator + rows).
    """
    def escape(value: str) -> str:
        return str(value).replace("|", "\\|")

    header = "| " + " | ".join(columns) + " |"
    separator = "|" + "|".join("---" for _ in columns) + "|"
    data_rows = []
    for row in rows:
        cells = [escape(row.get(col, "")) for col in columns]
        data_rows.append("| " + " | ".join(cells) + " |")

    return "\n".join([header, separator] + data_rows)


def read_note(node_id: str) -> str:
    """Read notes for a process node. Returns "" if not found."""
    # eTOM node IDs use dotted numeric form (e.g. "1.2.3.4") or slash form for L0/L1 synthetic
    # IDs. Both separators map to "_". Collision between e.g. "1.2.3" and "1_2_3" is theoretically
    # possible but does not occur in practice with real eTOM data.
    safe_id = node_id.replace("/", "_").replace(".", "_")
    path = Path(_get_data_dir()) / "notes" / f"{safe_id}.md"
    try:
        return path.read_text(encoding="utf-8")
    except FileNotFoundError:
        return ""


def write_note(node_id: str, content: str) -> None:
    """Write notes for a process node. Creates notes dir if needed."""
    # eTOM node IDs use dotted numeric form (e.g. "1.2.3.4") or slash form for L0/L1 synthetic
    # IDs. Both separators map to "_". Collision between e.g. "1.2.3" and "1_2_3" is theoretically
    # possible but does not occur in practice with real eTOM data.
    safe_id = node_id.replace("/", "_").replace(".", "_")
    notes_dir = Path(_get_data_dir()) / "notes"
    os.makedirs(notes_dir, exist_ok=True)
    (notes_dir / f"{safe_id}.md").write_text(content, encoding="utf-8")


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


def ensure_data_files() -> None:
    """Called on app startup. Creates any missing data files with empty tables."""
    os.makedirs(_get_data_dir(), exist_ok=True)
    os.makedirs(os.path.join(_get_data_dir(), "notes"), exist_ok=True)

    _ensure_file(
        "classifications.md",
        frontmatter={"version": 2},
        body="## Classifications\n\n" + write_md_table([], _CLS_NEW_COLUMNS)
    )
    _ensure_file(
        "descoped.md",
        frontmatter={"version": 1},
        body="## Descoped\n\n" + write_md_table([], ["id", "name", "reason", "notes"])
    )
    _ensure_file(
        "tags.md",
        frontmatter={"version": 1},
        body="## Tags\n\n" + write_md_table([], ["id", "name", "colour", "description"])
    )
    _ensure_file(
        "tag_assignments.md",
        frontmatter={"version": 1},
        body="## Assignments\n\n" + write_md_table([], ["node_id", "tag_id", "cascade"])
    )
    _ensure_file(
        "teams.md",
        frontmatter={"version": 1},
        body="## Teams\n\n" + write_md_table([], ["node_id", "team", "function"])
    )
    _ensure_file(
        "value-streams.md",
        frontmatter={"version": 1},
        body="## Assignments\n\n" + write_md_table([], ["stream_id", "process_id"])
    )


def _ensure_file(filename: str, frontmatter: dict, body: str) -> None:
    """Create file only if it doesn't exist."""
    path = _data_path(filename)
    if not path.exists():
        write_md_file(filename, frontmatter, body)


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
