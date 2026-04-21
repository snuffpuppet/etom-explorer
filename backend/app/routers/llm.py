"""LLM API router — model listing and classification seeding endpoints."""

import asyncio
from fastapi import APIRouter, BackgroundTasks, Request, HTTPException
from pydantic import BaseModel

from app.llm.client import get_models
from app.llm.seeding import seed_classifications

router = APIRouter()


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


def _run_seed(app_state, process_tree, provider: str, model: str):
    """Synchronous wrapper that runs the async seeding coroutine in a new event loop."""
    async def _do():
        try:
            result = await seed_classifications(process_tree, provider, model)
            app_state.seed_status = "done"
            app_state.seed_result = result
        except Exception as exc:
            app_state.seed_status = "error"
            app_state.seed_result = {"error": str(exc)}

    asyncio.run(_do())


@router.post("/llm/seed")
async def start_seed(body: SeedRequest, request: Request, background_tasks: BackgroundTasks):
    request.app.state.seed_status = "running"
    request.app.state.seed_result = None

    background_tasks.add_task(
        _run_seed,
        request.app.state,
        request.app.state.process_tree,
        body.provider,
        body.model,
    )

    return {"status": "started", "message": "Seeding started in background"}


@router.get("/llm/seed/status")
async def seed_status(request: Request):
    status = getattr(request.app.state, "seed_status", "idle")
    result = getattr(request.app.state, "seed_result", None)
    return {"status": status, "result": result}
