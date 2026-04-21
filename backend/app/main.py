import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.parser import parse_excel

EXCEL_PATH = os.getenv(
    "EXCEL_PATH",
    "/app/data_source/GB921_Business_Process_Framework_Processes_Excel_v25.5.xlsx",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.process_tree = parse_excel(EXCEL_PATH)
    yield


app = FastAPI(title="eTOM Explorer API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.routers import processes  # noqa: E402

app.include_router(processes.router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok"}
