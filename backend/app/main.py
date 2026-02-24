from contextlib import asynccontextmanager
import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import router as api_router
from app.database import create_db_and_tables
from app.background import periodic_version_check


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()  # runs when the server starts
    task = asyncio.create_task(periodic_version_check())
    yield  # Anything after yield runs when the server shuts down

    task.cancel()  # On shutdown, cancel the background task

    try:
        await task
    except asyncio.CancelledError:
        # This is expected on shutdown
        pass


app = FastAPI(title="WoW Version Tracker", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")


@app.get("/")
async def root():
    return {
        "message": "WoW Version Tracker API is running",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
