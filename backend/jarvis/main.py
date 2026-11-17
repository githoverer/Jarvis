
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from jarvis.config import APP_NAME, APP_VERSION, MODEL_NAME
from jarvis.api.chat import router as chat_router
from jarvis.database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    print(f"{APP_NAME} backend starting...")

    init_db()

    print("SQLite database initialized.")
    print(f"Database location: backend/data/jarvis.db")

    yield

    print(f"{APP_NAME} backend shutting down...")


app = FastAPI(
    title=APP_NAME,
    version=APP_VERSION,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:1420",
        "http://127.0.0.1:1420",
        "tauri://localhost",
        "http://tauri.localhost",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router)


@app.get("/health")
async def health():
    return {
        "status": "online",
        "assistant": APP_NAME,
        "version": APP_VERSION,
        "model": MODEL_NAME,
        "database": "sqlite",
    }
