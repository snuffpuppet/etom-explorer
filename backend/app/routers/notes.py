from fastapi import APIRouter, Request
from app.models import NoteResponse, NoteUpdate
from app.persistence import read_note, write_note

router = APIRouter()


@router.get("/notes/{node_id:path}", response_model=NoteResponse)
async def get_note(node_id: str, request: Request):
    content = read_note(node_id)
    return NoteResponse(id=node_id, content=content)


@router.put("/notes/{node_id:path}", response_model=NoteResponse)
async def update_note(node_id: str, update: NoteUpdate, request: Request):
    write_note(node_id, update.content)
    return NoteResponse(id=node_id, content=update.content)
