from __future__ import annotations

import logging
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from .config import settings
from .routers import ai, auth, dashboard, goals, meals, muscle_boost, quota, rewards, wallet
from .utils import ok

app = FastAPI(
    title="FitCalorie Python Backend",
    version="0.1.0",
)
logger = logging.getLogger("uvicorn.error")
media_dir = Path(__file__).resolve().parents[1] / "storage"
media_dir.mkdir(parents=True, exist_ok=True)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.app_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/media", StaticFiles(directory=media_dir), name="media")


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    if exc.status_code == 400:
        client_host = request.client.host if request.client else "unknown"
        client_port = request.client.port if request.client else "unknown"
        logger.warning(
            '400 Bad Request: %s %s from %s:%s detail=%r',
            request.method,
            request.url.path,
            client_host,
            client_port,
            exc.detail,
        )

    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=exc.headers,
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    client_host = request.client.host if request.client else "unknown"
    client_port = request.client.port if request.client else "unknown"
    logger.exception(
        "500 Internal Server Error: %s %s from %s:%s",
        request.method,
        request.url.path,
        client_host,
        client_port,
        exc_info=exc,
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error"},
    )


@app.get("/api/health")
def health_check():
    return ok({"status": "healthy"})


app.include_router(auth.router, prefix="/api")
app.include_router(goals.router, prefix="/api")
app.include_router(meals.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(ai.router, prefix="/api")
app.include_router(muscle_boost.router, prefix="/api")
app.include_router(wallet.router, prefix="/api")
app.include_router(quota.router, prefix="/api")
app.include_router(rewards.router, prefix="/api")

if settings.frontend_dist_dir:
    frontend_dir = Path(settings.frontend_dist_dir).resolve()
    if frontend_dir.exists():
        app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")
