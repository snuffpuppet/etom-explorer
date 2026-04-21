from fastapi import APIRouter, Request, HTTPException
from urllib.parse import unquote
from app.models import TagDef, TagDefCreate, TagAssignment, TagAssignmentUpdate
from app.persistence import read_md_file, write_md_file, parse_md_table, write_md_table
from app.utils import find_node

router = APIRouter()

DEFS_FILE = "tags.md"
DEFS_SECTION = "Tags"
DEFS_COLUMNS = ["id", "name", "colour", "description"]

ASSIGN_FILE = "tag_assignments.md"
ASSIGN_SECTION = "Assignments"
ASSIGN_COLUMNS = ["node_id", "tag_id", "cascade"]


def _read_defs() -> list[dict]:
    _, body = read_md_file(DEFS_FILE)
    return parse_md_table(body, DEFS_SECTION)


def _write_defs(rows: list[dict]) -> None:
    body = f"## {DEFS_SECTION}\n\n" + write_md_table(rows, DEFS_COLUMNS)
    write_md_file(DEFS_FILE, {"version": 1}, body)


def _read_assignments() -> list[dict]:
    _, body = read_md_file(ASSIGN_FILE)
    return parse_md_table(body, ASSIGN_SECTION)


def _write_assignments(rows: list[dict]) -> None:
    body = f"## {ASSIGN_SECTION}\n\n" + write_md_table(rows, ASSIGN_COLUMNS)
    write_md_file(ASSIGN_FILE, {"version": 1}, body)


@router.get("/tags", response_model=list[TagDef])
async def list_tags():
    return [TagDef(**r) for r in _read_defs()]


@router.post("/tags", response_model=TagDef, status_code=201)
async def create_tag(body: TagDefCreate):
    rows = _read_defs()
    if any(r["name"].lower() == body.name.lower() for r in rows):
        raise HTTPException(status_code=409, detail=f"Tag '{body.name}' already exists")
    # Generate a slug id from name
    import re
    tag_id = re.sub(r"[^a-z0-9]+", "-", body.name.lower()).strip("-")
    if any(r["id"] == tag_id for r in rows):
        tag_id = f"{tag_id}-{len(rows)}"
    new_row = {"id": tag_id, "name": body.name, "colour": body.colour, "description": body.description}
    rows.append(new_row)
    _write_defs(rows)
    return TagDef(**new_row)


@router.put("/tags/{tag_id}", response_model=TagDef)
async def update_tag(tag_id: str, body: TagDefCreate):
    rows = _read_defs()
    existing = next((r for r in rows if r["id"] == tag_id), None)
    if existing is None:
        raise HTTPException(status_code=404, detail=f"Tag '{tag_id}' not found")
    updated = {"id": tag_id, "name": body.name, "colour": body.colour, "description": body.description}
    rows = [updated if r["id"] == tag_id else r for r in rows]
    _write_defs(rows)
    return TagDef(**updated)


@router.delete("/tags/{tag_id}", status_code=204)
async def delete_tag(tag_id: str):
    rows = _read_defs()
    if not any(r["id"] == tag_id for r in rows):
        raise HTTPException(status_code=404, detail=f"Tag '{tag_id}' not found")
    _write_defs([r for r in rows if r["id"] != tag_id])
    # Remove all assignments for this tag
    assignments = _read_assignments()
    _write_assignments([a for a in assignments if a["tag_id"] != tag_id])


@router.get("/tags/assignments", response_model=list[TagAssignment])
async def list_assignments():
    return [TagAssignment(**r) for r in _read_assignments()]


@router.put("/tags/assignments/{node_id:path}", response_model=list[TagAssignment])
async def update_assignments(node_id: str, body: TagAssignmentUpdate, request: Request):
    """Replace all tag assignments for a node."""
    node_id = unquote(node_id)
    tree = request.app.state.process_tree
    if find_node(tree, node_id) is None:
        raise HTTPException(status_code=404, detail=f"Node '{node_id}' not found")

    tag_defs = {r["id"] for r in _read_defs()}
    for entry in body.assignments:
        if entry.tag_id not in tag_defs:
            raise HTTPException(status_code=404, detail=f"Tag '{entry.tag_id}' not found")

    assignments = _read_assignments()
    # Remove existing assignments for this node
    assignments = [a for a in assignments if a["node_id"] != node_id]
    new_rows = [{"node_id": node_id, "tag_id": e.tag_id, "cascade": str(e.cascade).lower()} for e in body.assignments]
    assignments.extend(new_rows)
    _write_assignments(assignments)
    return [TagAssignment(**r) for r in new_rows]
