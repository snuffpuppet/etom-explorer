from fastapi import APIRouter, Request, HTTPException
from urllib.parse import unquote
from app.models import DescopedEntry, DescopedUpdate
from app.persistence import read_md_file, write_md_file, parse_md_table, write_md_table
from app.utils import find_node

router = APIRouter()

FILENAME = "descoped.md"
SECTION = "Descoped"
COLUMNS = ["id", "name", "reason", "notes"]


@router.get("/descoped", response_model=list[DescopedEntry])
async def get_descoped(request: Request):
    """Return all descoped entries."""
    _, body = read_md_file(FILENAME)
    rows = parse_md_table(body, SECTION)
    return [DescopedEntry(**row) for row in rows]


@router.put("/descoped/{node_id:path}", response_model=DescopedEntry)
async def upsert_descoped(node_id: str, update: DescopedUpdate, request: Request):
    """Upsert a descoped entry for a process node."""
    node_id = unquote(node_id)

    tree = request.app.state.process_tree
    node = find_node(tree, node_id)
    if node is None:
        raise HTTPException(status_code=404, detail=f"Process node '{node_id}' not found")

    _, body = read_md_file(FILENAME)
    rows = parse_md_table(body, SECTION)

    new_row = {"id": node_id, "name": node.name, "reason": update.reason, "notes": update.notes}
    existing = next((r for r in rows if r["id"] == node_id), None)
    if existing:
        rows = [new_row if r["id"] == node_id else r for r in rows]
    else:
        rows.append(new_row)

    body_new = f"## {SECTION}\n\n" + write_md_table(rows, COLUMNS)
    write_md_file(FILENAME, {"version": 1}, body_new)
    return DescopedEntry(**new_row)


@router.delete("/descoped/{node_id:path}")
async def remove_descoped(node_id: str, request: Request):
    """Remove a descoped entry."""
    node_id = unquote(node_id)

    _, body = read_md_file(FILENAME)
    rows = parse_md_table(body, SECTION)

    existing = next((r for r in rows if r["id"] == node_id), None)
    if existing is None:
        raise HTTPException(status_code=404, detail=f"Descoped entry '{node_id}' not found")

    rows = [r for r in rows if r["id"] != node_id]
    body_new = f"## {SECTION}\n\n" + write_md_table(rows, COLUMNS)
    write_md_file(FILENAME, {"version": 1}, body_new)
    return {"deleted": node_id}
