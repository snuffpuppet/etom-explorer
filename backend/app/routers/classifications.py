from fastapi import APIRouter, Request, HTTPException
from urllib.parse import unquote
from app.models import Classification, ClassificationUpdate
from app.persistence import read_md_file, write_md_file, parse_md_table, write_md_table
from app.utils import find_node

router = APIRouter()

FILENAME = "classifications.md"
SECTION = "Classifications"
COLUMNS = ["id", "name", "scope_status", "review_status", "reason", "notes"]


@router.get("/classifications", response_model=list[Classification])
async def get_classifications(request: Request):
    _, body = read_md_file(FILENAME)
    rows = parse_md_table(body, SECTION)
    return [Classification(**row) for row in rows]


@router.put("/classifications/{node_id:path}", response_model=Classification)
async def update_classification(node_id: str, update: ClassificationUpdate, request: Request):
    node_id = unquote(node_id)

    tree = request.app.state.process_tree
    node = find_node(tree, node_id)
    if node is None:
        raise HTTPException(status_code=404, detail=f"Process node '{node_id}' not found")

    _, body = read_md_file(FILENAME)
    rows = parse_md_table(body, SECTION)

    new_row = {
        "id": node_id,
        "name": node.name,
        "scope_status": update.scope_status,
        "review_status": update.review_status,
        "reason": update.reason,
        "notes": update.notes,
    }
    existing = next((r for r in rows if r["id"] == node_id), None)
    if existing:
        rows = [new_row if r["id"] == node_id else r for r in rows]
    else:
        rows.append(new_row)

    body_new = f"## {SECTION}\n\n" + write_md_table(rows, COLUMNS)
    write_md_file(FILENAME, {"version": 2}, body_new)
    return Classification(**new_row)
