from fastapi import APIRouter

router = APIRouter()


@router.get("/processes")
async def get_processes():
    raise NotImplementedError("Processes router not yet implemented — see Task 10")
