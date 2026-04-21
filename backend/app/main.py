import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.parser import parse_excel
from app.persistence import ensure_data_files

EXCEL_PATH = os.getenv(
    "EXCEL_PATH",
    "/app/data_source/GB921_Business_Process_Framework_Processes_Excel_v25.5.xlsx",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.process_tree = parse_excel(EXCEL_PATH)
    ensure_data_files()
    app.state.seed_status = "idle"
    app.state.seed_result = None
    yield


app = FastAPI(title="eTOM Explorer API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,  # No auth yet; allow_credentials=True is invalid with allow_origins=["*"]
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.routers import processes, classifications, descoped, tags, teams, search, chat, llm, notes  # noqa: E402

app.include_router(processes.router, prefix="/api")
app.include_router(classifications.router, prefix="/api")
app.include_router(descoped.router, prefix="/api")
app.include_router(tags.router, prefix="/api")
app.include_router(teams.router, prefix="/api")
app.include_router(search.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(llm.router, prefix="/api")
app.include_router(notes.router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok"}
