"""
backend/core/logging_middleware.py

Structured HTTP Request, Response, Performance & Error Traceback Logging Middleware.
Logs all API calls across the entire backend application.
"""

import time
import logging
import traceback
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

# Configure root backend logger
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("studentalumni.backend")


class AppLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        client_ip = request.client.host if request.client else "127.0.0.1"
        method = request.method
        path = request.url.path

        logger.info(f"👉 [REQ] {method} {path} | Client IP: {client_ip}")

        try:
            response: Response = await call_next(request)
            duration_ms = round((time.time() - start_time) * 1000, 2)
            status_code = response.status_code

            log_level = logging.INFO
            if status_code >= 500:
                log_level = logging.ERROR
            elif status_code >= 400:
                log_level = logging.WARNING

            logger.log(
                log_level,
                f"👈 [RES] {method} {path} | Status: {status_code} | Duration: {duration_ms}ms"
            )
            return response
        except Exception as exc:
            duration_ms = round((time.time() - start_time) * 1000, 2)
            error_trace = traceback.format_exc()
            logger.error(
                f"💥 [ERROR] {method} {path} | Duration: {duration_ms}ms | Exception: {str(exc)}\n{error_trace}"
            )
            raise exc
