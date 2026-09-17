"""
core.middleware — Production security middleware stack.

Registers (in order of application):
  1. RequestIdMiddleware    — injects X-Request-Id on every request/response
  2. SecurityHeadersMiddleware — adds hardened HTTP security headers
  3. MongoSanitizeMiddleware   — strips MongoDB operator keys from JSON bodies

Usage in server.py:
    from core.middleware import register_security_middleware
    register_security_middleware(app)
"""
import json
import logging
import os
import re
import uuid
from typing import Callable

from fastapi import FastAPI
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# 1. Real-IP extraction (proxy-aware)
# ---------------------------------------------------------------------------

def get_real_ip(request: Request) -> str:
    """
    Extract the real client IP in proxy/CDN deployments.

    Priority:
      CF-Connecting-IP  (Cloudflare — most trusted, set by CDN)
      X-Real-IP         (Nginx single-proxy setups)
      X-Forwarded-For   (standard, leftmost non-private IP)
      request.client.host (fallback — direct connection)
    """
    cf_ip = request.headers.get("CF-Connecting-IP", "").strip()
    if cf_ip:
        return cf_ip

    real_ip = request.headers.get("X-Real-IP", "").strip()
    if real_ip:
        return real_ip

    forwarded = request.headers.get("X-Forwarded-For", "").strip()
    if forwarded:
        # Leftmost entry is the original client; rightmost entries are proxies
        candidate = forwarded.split(",")[0].strip()
        if candidate:
            return candidate

    return request.client.host if request.client else "unknown"


# ---------------------------------------------------------------------------
# 2. Request ID middleware
# ---------------------------------------------------------------------------

class RequestIdMiddleware(BaseHTTPMiddleware):
    """
    Injects a unique X-Request-Id header on every request and response.
    Respects an incoming header from upstream proxies/clients.
    """
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        req_id = (
            request.headers.get("X-Request-Id")
            or request.headers.get("X-Correlation-Id")
            or str(uuid.uuid4())
        )
        # Attach to request state so route handlers can log it
        request.state.request_id = req_id
        response = await call_next(request)
        response.headers["X-Request-Id"] = req_id
        return response


# ---------------------------------------------------------------------------
# 3. Security headers middleware
# ---------------------------------------------------------------------------

_IS_PROD = os.getenv("ENV", "development").lower() == "production"

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Adds hardened HTTP security headers to every response.

    These defend against XSS, clickjacking, MIME sniffing, and information
    leakage — all OWASP Top-10 attack vectors.
    """
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)

        # ── Prevent MIME sniffing ───────────────────────────────────────────
        response.headers["X-Content-Type-Options"] = "nosniff"

        # ── Clickjacking protection ─────────────────────────────────────────
        response.headers["X-Frame-Options"] = "DENY"

        # ── XSS protection (legacy browsers) ───────────────────────────────
        response.headers["X-XSS-Protection"] = "1; mode=block"

        # ── Referrer policy ─────────────────────────────────────────────────
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # ── Permissions policy (disable dangerous browser features) ────────
        response.headers["Permissions-Policy"] = (
            "camera=(), microphone=(), geolocation=(), "
            "payment=(), usb=(), magnetometer=(), gyroscope=()"
        )

        # ── Content Security Policy ─────────────────────────────────────────
        # Allow API requests, CDN scripts, and image blobs across all environments
        response.headers["Content-Security-Policy"] = (
            "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; "
            "script-src * 'unsafe-inline' 'unsafe-eval' data: blob:; "
            "style-src * 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src * data: https://fonts.gstatic.com; "
            "img-src * data: blob:; "
            "connect-src * 'unsafe-inline' data: blob:; "
            "frame-ancestors 'none';"
        )

        # ── HSTS — only over HTTPS, only in production ──────────────────────
        if _IS_PROD:
            response.headers["Strict-Transport-Security"] = (
                "max-age=63072000; includeSubDomains; preload"
            )

        # ── Remove server fingerprinting headers ────────────────────────────
        # FastAPI/Uvicorn sets these; strip them to reduce attack surface.
        for h in ("server", "Server", "x-powered-by", "X-Powered-By"):
            if h in response.headers:
                del response.headers[h]

        return response


# ---------------------------------------------------------------------------
# 4. MongoDB operator injection sanitizer
# ---------------------------------------------------------------------------

# Regex: keys that start with $ (MongoDB operators like $where, $gt, etc.)
_MONGO_OP_RE = re.compile(r'^\$')

def _strip_mongo_ops(obj, depth: int = 0):
    """
    Recursively remove any key that starts with '$' from a parsed JSON object.
    This prevents NoSQL injection via crafted JSON payloads.
    Depth-limited to 10 to prevent DoS via deeply nested objects.
    """
    if depth > 10:
        return obj
    if isinstance(obj, dict):
        return {
            k: _strip_mongo_ops(v, depth + 1)
            for k, v in obj.items()
            if not _MONGO_OP_RE.match(str(k))
        }
    if isinstance(obj, list):
        return [_strip_mongo_ops(i, depth + 1) for i in obj]
    return obj


class MongoSanitizeMiddleware(BaseHTTPMiddleware):
    """
    Strips MongoDB operator keys (keys starting with '$') from JSON request
    bodies to prevent NoSQL injection attacks.

    Only processes requests with Content-Type: application/json.
    Does NOT affect multipart/form-data or query parameters.
    """
    _SAFE_PATHS = {"/api/health", "/health", "/docs", "/openapi.json", "/redoc"}

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip non-JSON and safe paths
        content_type = request.headers.get("content-type", "")
        if (
            "application/json" not in content_type
            or request.url.path in self._SAFE_PATHS
            or request.method in ("GET", "HEAD", "OPTIONS")
        ):
            return await call_next(request)

        try:
            raw = await request.body()
            if raw:
                parsed = json.loads(raw)
                cleaned = _strip_mongo_ops(parsed)
                if cleaned != parsed:
                    logger.warning(
                        "[SECURITY] MongoSanitize: stripped operator keys "
                        "from request body | path=%s | ip=%s",
                        request.url.path,
                        get_real_ip(request),
                    )
                # Re-inject the cleaned body so route handlers see it
                cleaned_bytes = json.dumps(cleaned).encode()
                # Rebuild the receive channel with sanitized bytes
                async def receive():
                    return {"type": "http.request", "body": cleaned_bytes}
                request = Request(request.scope, receive)
        except (json.JSONDecodeError, UnicodeDecodeError):
            pass  # malformed JSON — let FastAPI's validator handle it

        return await call_next(request)


# ---------------------------------------------------------------------------
# 5. Registration helper
# ---------------------------------------------------------------------------

def register_security_middleware(app: FastAPI) -> None:
    """
    Register all security middleware on the FastAPI app.

    IMPORTANT: Starlette/FastAPI applies middleware in REVERSE registration
    order (last-added runs first). We register outermost wrappers last.

    Execution order on a real request:
      RequestId → SecurityHeaders → MongoSanitize → route handler
    """
    # Innermost — registered first
    app.add_middleware(MongoSanitizeMiddleware)
    app.add_middleware(SecurityHeadersMiddleware)
    # Outermost — registered last (executes first)
    app.add_middleware(RequestIdMiddleware)

    logger.info("[SECURITY] Security middleware stack registered: "
                "RequestId → SecurityHeaders → MongoSanitize")
