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
    safe_id = node_id.replace("/", "_").replace(".", "_")
    path = Path(_get_data_dir()) / "notes" / f"{safe_id}.md"
    try:
        return path.read_text(encoding="utf-8")
    except FileNotFoundError:
        return ""


def write_note(node_id: str, content: str) -> None:
    """Write notes for a process node. Creates notes dir if needed."""
    safe_id = node_id.replace("/", "_").replace(".", "_")
    notes_dir = Path(_get_data_dir()) / "notes"
    os.makedirs(notes_dir, exist_ok=True)
    (notes_dir / f"{safe_id}.md").write_text(content, encoding="utf-8")


def ensure_data_files() -> None:
    """Called on app startup. Creates any missing data files with empty tables."""
    os.makedirs(_get_data_dir(), exist_ok=True)
    os.makedirs(os.path.join(_get_data_dir(), "notes"), exist_ok=True)

    _ensure_file(
        "classifications.md",
        frontmatter={"version": 1},
        body="## Classifications\n\n" + write_md_table([], ["id", "name", "category", "review_status", "notes"])
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


def _ensure_file(filename: str, frontmatter: dict, body: str) -> None:
    """Create file only if it doesn't exist."""
    path = _data_path(filename)
    if not path.exists():
        write_md_file(filename, frontmatter, body)


if __name__ == "__main__":
    import tempfile
    os.environ["DATA_DIR"] = tempfile.mkdtemp()

    ensure_data_files()
    fm, body = read_md_file("classifications.md")
    assert fm["version"] == 1, f"Expected version 1, got {fm.get('version')}"
    rows = parse_md_table(body, "Classifications")
    assert rows == [], f"Expected [], got {rows}"
    # Write a row and read it back
    rows = [{"id": "1.1.1", "name": "Test", "category": "oss", "review_status": "unreviewed", "notes": ""}]
    table_str = write_md_table(rows, ["id", "name", "category", "review_status", "notes"])
    write_md_file("classifications.md", {"version": 1}, "## Classifications\n\n" + table_str)
    fm2, body2 = read_md_file("classifications.md")
    rows2 = parse_md_table(body2, "Classifications")
    assert len(rows2) == 1 and rows2[0]["id"] == "1.1.1", f"Got: {rows2}"
    print("✅ persistence.py self-test passed")
