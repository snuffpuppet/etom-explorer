"""LLM API router — model listing and classification seeding endpoints."""

import asyncio

from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel

from app.llm.client import get_models
from app.llm.seeding import seed_classifications

router = APIRouter()

# Store strong references to background tasks to prevent garbage collection
_background_tasks: set = set()


class SeedRequest(BaseModel):
    provider: str = "claude"
    model: str = "claude-sonnet-4-6"


@router.get("/llm/models")
async def list_models(provider: str = "claude"):
    try:
        models = get_models(provider)
    except ValueError:
        raise HTTPException(status_code=400, detail="Unknown provider. Use 'claude' or 'openrouter'.")
    return {"provider": provider, "models": models}


async def _run_seed(app_state, process_tree, provider: str, model: str):
    """Async background task for classification seeding."""
    try:
        result = await seed_classifications(process_tree, provider, model)
        app_state.seed_status = "done"
        app_state.seed_result = result
    except Exception as exc:
        app_state.seed_status = "error"
        app_state.seed_result = {"error": str(exc)}


@router.post("/llm/seed")
async def start_seed(body: SeedRequest, request: Request):
    if getattr(request.app.state, "seed_status", "idle") == "running":
        raise HTTPException(status_code=409, detail="Seeding already in progress")
    request.app.state.seed_status = "running"
    request.app.state.seed_result = None
    task = asyncio.create_task(
        _run_seed(request.app.state, request.app.state.process_tree, body.provider, body.model)
    )
    _background_tasks.add(task)
    task.add_done_callback(_background_tasks.discard)
    return {"status": "started", "message": "Seeding started in background"}


@router.get("/llm/seed/status")
async def seed_status(request: Request):
    status = getattr(request.app.state, "seed_status", "idle")
    result = getattr(request.app.state, "seed_result", None)
    return {"status": status, "result": result}
