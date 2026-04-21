from fastapi import APIRouter, HTTPException, Request
from app.models import ValueStream, ValueStreamUpdate
from app.persistence import read_md_file, write_md_file, parse_md_table, write_md_table
from app.utils import find_node

router = APIRouter()

VALUE_STREAMS = [
    {"id": "vs-p2o",  "category": "customer",    "name": "Prospect to Order"},
    {"id": "vs-o2a",  "category": "customer",    "name": "Order to Activate"},
    {"id": "vs-u2c",  "category": "customer",    "name": "Usage to Cash"},
    {"id": "vs-p2r",  "category": "customer",    "name": "Problem to Resolution"},
    {"id": "vs-r2c",  "category": "customer",    "name": "Request to Change"},
    {"id": "vs-t2c",  "category": "customer",    "name": "Terminate to Confirm"},
    {"id": "vs-p2b",  "category": "operational", "name": "Plan to Build"},
    {"id": "vs-m2r",  "category": "operational", "name": "Monitor to Resolve"},
    {"id": "vs-pr2o", "category": "operational", "name": "Procure to Operate"},
    {"id": "vs-i2i",  "category": "operational", "name": "Insight to Improve"},
]

_VS_IDS = {vs["id"] for vs in VALUE_STREAMS}

FILENAME = "value-streams.md"
SECTION = "Assignments"
COLUMNS = ["stream_id", "process_id"]


def _read_rows() -> list[dict]:
    _, body = read_md_file(FILENAME)
    return parse_md_table(body, SECTION)


def _write_rows(rows: list[dict]) -> None:
    body = f"## {SECTION}\n\n" + write_md_table(rows, COLUMNS)
    write_md_file(FILENAME, {"version": 1}, body)


def _build_response(rows: list[dict]) -> list[ValueStream]:
    # Group process_ids by stream_id
    grouped: dict[str, list[str]] = {vs["id"]: [] for vs in VALUE_STREAMS}
    for row in rows:
        sid = row.get("stream_id", "")
        pid = row.get("process_id", "")
        if sid in grouped and pid:
            grouped[sid].append(pid)

    return [
        ValueStream(id=vs["id"], category=vs["category"], name=vs["name"], process_ids=grouped[vs["id"]])
        for vs in VALUE_STREAMS
    ]


@router.get("/value-streams", response_model=list[ValueStream])
async def list_value_streams():
    rows = _read_rows()
    return _build_response(rows)


@router.put("/value-streams/{stream_id}", response_model=ValueStream)
async def update_value_stream(stream_id: str, body: ValueStreamUpdate, request: Request):
    if stream_id not in _VS_IDS:
        raise HTTPException(status_code=404, detail=f"Value stream '{stream_id}' not found")

    tree = request.app.state.process_tree
    for pid in body.process_ids:
        if find_node(tree, pid) is None:
            raise HTTPException(status_code=422, detail=f"Process node '{pid}' not found")

    rows = _read_rows()
    # Remove existing rows for this stream
    rows = [r for r in rows if r.get("stream_id") != stream_id]
    # Append new rows
    new_rows = [{"stream_id": stream_id, "process_id": pid} for pid in body.process_ids]
    rows.extend(new_rows)
    _write_rows(rows)

    vs_def = next(vs for vs in VALUE_STREAMS if vs["id"] == stream_id)
    return ValueStream(id=stream_id, category=vs_def["category"], name=vs_def["name"], process_ids=body.process_ids)
