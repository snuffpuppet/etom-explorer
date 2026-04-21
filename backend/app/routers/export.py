import re
from datetime import date
from io import StringIO

from fastapi import APIRouter
from fastapi.responses import Response

from app.models import ExportRequest
from app.persistence import parse_md_table, read_md_file, read_note

router = APIRouter()


def _esc(s: str) -> str:
    """Escape HTML special characters in user-supplied strings."""
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

CATEGORY_LABELS = {
    "oss": "OSS",
    "oss_bss": "OSS/BSS",
    "bss": "BSS",
    "other": "Other",
    "unclassified": "Unclassified",
}
REVIEW_STATUS_LABELS = {
    "unreviewed": "Unreviewed",
    "under_review": "Under Review",
    "classified": "Classified",
    "descoped": "Descoped",
}


def _build_markdown() -> str:
    # Load classifications
    _, cls_body = read_md_file("classifications.md")
    cls_rows = parse_md_table(cls_body, "Classifications")
    cls_by_id = {r["id"]: r for r in cls_rows}

    # Load descoped
    _, dsc_body = read_md_file("descoped.md")
    dsc_rows = parse_md_table(dsc_body, "Descoped")
    dsc_by_id = {r["id"]: r for r in dsc_rows}

    # Load teams
    _, teams_body = read_md_file("teams.md")
    teams_rows = parse_md_table(teams_body, "Teams")
    teams_by_node: dict[str, list[dict]] = {}
    for row in teams_rows:
        nid = row["node_id"]
        teams_by_node.setdefault(nid, []).append({"team": row["team"], "function": row["function"]})

    # Bucket processes into sections
    new_processes = []
    changing_processes = []
    descoped_processes = []

    all_ids = set(cls_by_id.keys()) | set(dsc_by_id.keys())

    for node_id in all_ids:
        # Descoped takes priority
        if node_id in dsc_by_id:
            descoped_processes.append(node_id)
        elif node_id in cls_by_id:
            category = cls_by_id[node_id].get("category", "unclassified")
            if category in ("oss", "oss_bss"):
                new_processes.append(node_id)
            elif category in ("bss", "other"):
                changing_processes.append(node_id)
            # unclassified processes are omitted from the export

    # Sort for deterministic output
    new_processes.sort()
    changing_processes.sort()
    descoped_processes.sort()

    buf = StringIO()
    today = date.today().isoformat()
    buf.write(f"# eTOM Process Requirements Document\n\nGenerated: {today}\n\n")

    def write_classified_section(heading: str, ids: list[str]) -> None:
        buf.write(f"## {heading}\n\n")
        if not ids:
            buf.write("_None_\n\n")
            return
        for node_id in ids:
            row = cls_by_id[node_id]
            name = row.get("name", "")
            category = row.get("category", "unclassified")
            review_status = row.get("review_status", "unreviewed")
            cat_label = CATEGORY_LABELS.get(category, category)
            rs_label = REVIEW_STATUS_LABELS.get(review_status, review_status)

            team_entries = teams_by_node.get(node_id, [])
            if team_entries:
                teams_str = ", ".join(
                    f"{e['team']}: {e['function']}" if e.get("function") else e["team"]
                    for e in team_entries
                )
            else:
                teams_str = "None assigned"

            notes = read_note(node_id)

            buf.write(f"### {node_id}: {name}\n\n")
            buf.write(f"- **Classification:** {cat_label}\n")
            buf.write(f"- **Review Status:** {rs_label}\n")
            buf.write(f"- **Teams:** {teams_str}\n")
            if notes.strip():
                buf.write(f"- **Notes:** {notes.strip()}\n")
            buf.write("\n---\n\n")

    write_classified_section("New Processes", new_processes)
    write_classified_section("Changing Processes", changing_processes)

    buf.write("## No Longer Needed\n\n")
    if not descoped_processes:
        buf.write("_None_\n\n")
    for node_id in descoped_processes:
        row = dsc_by_id[node_id]
        name = row.get("name", "")
        reason = row.get("reason", "")
        notes = read_note(node_id)

        buf.write(f"### {node_id}: {name}\n\n")
        buf.write(f"- **Reason:** {reason}\n")
        if notes.strip():
            buf.write(f"- **Notes:** {notes.strip()}\n")
        buf.write("\n---\n\n")

    return buf.getvalue()


def _md_to_html(md: str) -> str:
    lines = md.splitlines()
    buf = StringIO()
    buf.write(
        "<!DOCTYPE html>\n<html>\n"
        "<head><title>eTOM Process Requirements</title>"
        '<meta charset="utf-8"></head>\n'
        '<body style="font-family:sans-serif;max-width:900px;margin:2rem auto;padding:0 1rem">\n'
    )

    i = 0
    while i < len(lines):
        line = lines[i]

        if line.startswith("### "):
            buf.write(f"<h3>{_esc(line[4:])}</h3>\n")
            i += 1
        elif line.startswith("## "):
            buf.write(f"<h2>{_esc(line[3:])}</h2>\n")
            i += 1
        elif line.startswith("# "):
            buf.write(f"<h1>{_esc(line[2:])}</h1>\n")
            i += 1
        elif line.strip() == "---":
            buf.write("<hr>\n")
            i += 1
        elif line.startswith("- "):
            # Collect consecutive list items
            buf.write("<ul>\n")
            while i < len(lines) and lines[i].startswith("- "):
                item = _esc(lines[i][2:])
                item = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", item)
                buf.write(f"<li>{item}</li>\n")
                i += 1
            buf.write("</ul>\n")
        elif line.strip() == "":
            i += 1
        else:
            buf.write(f"<p>{_esc(line)}</p>\n")
            i += 1

    buf.write("</body>\n</html>\n")
    return buf.getvalue()


@router.post("/export")
async def export_document(request: ExportRequest):
    md_content = _build_markdown()

    if request.format == "html":
        content = _md_to_html(md_content)
        media_type = "text/html"
        filename = "etom-requirements.html"
    else:
        content = md_content
        media_type = "text/markdown"
        filename = "etom-requirements.md"

    headers = {"Content-Disposition": f'attachment; filename="{filename}"'}
    return Response(content=content, media_type=media_type, headers=headers)
