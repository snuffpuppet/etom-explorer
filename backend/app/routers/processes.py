from fastapi import APIRouter, Request, HTTPException
from urllib.parse import unquote
from app.models import ProcessNode

router = APIRouter()


def _find_node(tree: list[ProcessNode], node_id: str) -> ProcessNode | None:
    for node in tree:
        if node.id == node_id:
            return node
        found = _find_node(node.children, node_id)
        if found is not None:
            return found
    return None


@router.get("/processes", response_model=list[ProcessNode])
async def get_processes(request: Request) -> list[ProcessNode]:
    return request.app.state.process_tree


@router.get("/processes/{node_id:path}", response_model=ProcessNode)
async def get_process(node_id: str, request: Request) -> ProcessNode:
    decoded_id = unquote(node_id)
    node = _find_node(request.app.state.process_tree, decoded_id)
    if node is None:
        raise HTTPException(status_code=404, detail=f"Process node '{decoded_id}' not found")
    return node
