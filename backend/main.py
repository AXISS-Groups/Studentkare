"""Studentkare: persistent, authenticated healthcare application API."""
import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from services.db_sql import create_all_tables, is_persistent
from services.workflow_auth import router as auth_router, workflow_db, require_super_admin
from services.workflow_api import router as workflow_router
from services.otp_delivery import available_channels


@asynccontextmanager
async def lifespan(app):
    create_all_tables()
    yield


app = FastAPI(title="Studentkare Care API", version="1.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware,
    allow_origins=[value.strip() for value in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000,http://localhost:4173,http://127.0.0.1:4173").split(',')],
    allow_credentials=True, allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Content-Type", "X-CSRF-Token", "Idempotency-Key"],
)


class BodyLimitExceeded(Exception):
    pass


class BodyLimitMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        headers = dict(scope.get("headers", []))
        try:
            declared_size = int(headers.get(b"content-length", b"0"))
        except ValueError:
            return await JSONResponse({"detail": "Invalid Content-Length."}, status_code=400)(scope, receive, send)
        if declared_size > 12 * 1024 * 1024:
            return await JSONResponse({"detail": "Request exceeds the 12 MB limit."}, status_code=413)(scope, receive, send)
        size = 0
        async def limited_receive():
            nonlocal size
            message = await receive()
            size += len(message.get("body", b""))
            if size > 12 * 1024 * 1024:
                raise BodyLimitExceeded()
            return message
        try:
            await self.app(scope, limited_receive, send)
        except BodyLimitExceeded:
            await JSONResponse({"detail": "Request exceeds the 12 MB limit."}, status_code=413)(scope, receive, send)


app.add_middleware(BodyLimitMiddleware)


@app.middleware("http")
async def response_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Cache-Control"] = "no-store"
    return response


@app.exception_handler(SQLAlchemyError)
async def database_unavailable(request, exc):
    return JSONResponse(status_code=503, content={"detail": "The data service is unavailable. Please try again shortly."})


@app.get("/api/health")
def health(db=Depends(workflow_db)):
    db.execute(text("SELECT 1"))
    return {"status": "healthy", "persistent": is_persistent(), "integrations": {
        "otpChannels": available_channels(), "payments": False, "insurer": False,
        "deviceSync": False, "prescriptionReview": False,
    }}


@app.get("/api/persistence/status")
def persistence(user=Depends(require_super_admin), db=Depends(workflow_db)):
    db.execute(text("SELECT 1"))
    return {"persistent": is_persistent()}


app.include_router(auth_router)
app.include_router(workflow_router)
