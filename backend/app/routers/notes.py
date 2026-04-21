from urllib.parse import unquote
from fastapi import APIRouter, Request, HTTPException
from app.models import NoteResponse, NoteUpdate
from app.persistence import read_note, write_note
from app.utils import find_node

router = APIRouter()


@router.get("/notes/{node_id:path}", response_model=NoteResponse)
async def get_note(node_id: str, request: Request):
    node_id = unquote(node_id)
    tree = request.app.state.process_tree
    if find_node(tree, node_id) is None:
        raise HTTPException(status_code=404, detail=f"Process node '{node_id}' not found")
    content = read_note(node_id)
    return NoteResponse(id=node_id, content=content)


@router.put("/notes/{node_id:path}", response_model=NoteResponse)
async def update_note(node_id: str, update: NoteUpdate, request: Request):
    node_id = unquote(node_id)
    tree = request.app.state.process_tree
    if find_node(tree, node_id) is None:
        raise HTTPException(status_code=404, detail=f"Process node '{node_id}' not found")
    write_note(node_id, update.content)
    return NoteResponse(id=node_id, content=update.content)
