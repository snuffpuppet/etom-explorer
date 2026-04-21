from fastapi import APIRouter, Request, HTTPException
from urllib.parse import unquote
from app.models import TeamAssignment, TeamAssignmentUpdate
from app.persistence import read_md_file, write_md_file, parse_md_table, write_md_table
from app.utils import find_node

router = APIRouter()

FILENAME = "teams.md"
SECTION = "Teams"
COLUMNS = ["node_id", "team", "function"]


def _read_rows() -> list[dict]:
    _, body = read_md_file(FILENAME)
    return parse_md_table(body, SECTION)


def _write_rows(rows: list[dict]) -> None:
    body = f"## {SECTION}\n\n" + write_md_table(rows, COLUMNS)
    write_md_file(FILENAME, {"version": 1}, body)


@router.get("/teams", response_model=list[TeamAssignment])
async def list_teams():
    return [TeamAssignment(**r) for r in _read_rows()]


@router.put("/teams/{node_id:path}", response_model=list[TeamAssignment])
async def update_teams(node_id: str, body: TeamAssignmentUpdate, request: Request):
    """Replace all team:function assignments for a node."""
    node_id = unquote(node_id)
    tree = request.app.state.process_tree
    if find_node(tree, node_id) is None:
        raise HTTPException(status_code=404, detail=f"Node '{node_id}' not found")

    rows = _read_rows()
    rows = [r for r in rows if r["node_id"] != node_id]
    new_rows = [{"node_id": node_id, "team": e.team, "function": e.function} for e in body.assignments]
    rows.extend(new_rows)
    _write_rows(rows)
    return [TeamAssignment(**r) for r in new_rows]


@router.delete("/teams/{node_id:path}", status_code=204)
async def delete_teams(node_id: str, request: Request):
    """Remove all team assignments for a node."""
    node_id = unquote(node_id)
    rows = _read_rows()
    _write_rows([r for r in rows if r["node_id"] != node_id])
