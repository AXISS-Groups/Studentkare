"""
backend/core/rate_limiter.py

Sliding-window rate limiting.

Global shield (this file, wired as ASGI middleware in app/main.py):
    Caps requests per client IP for every HTTP request before routes or auth.
    Configured by RATE_LIMIT_API_PER_MINUTE (default 100 per 60s per IP).
    Skips liveness/docs paths so monitors never self-DoS.

Real-IP priority matches core.middleware.get_real_ip:
    CF-Connecting-IP, X-Real-IP, X-Forwarded-For (leftmost), then peer address.
"""

import logging
import os
import time
from typing import Dict, List, Tuple

from fastapi import HTTPException, Request, status
from starlette.responses import JSONResponse

logger = logging.getLogger("rate_limiter")

SKIPPED_PATHS = frozenset({"/api/health", "/api/info"})
SKIPPED_PREFIXES = ("/docs", "/openapi", "/redoc", "/static")

_MAX_TRACKED_KEYS = 10000


class SlidingWindowRateLimiter:
    """In-memory sliding window rate limiter for API endpoints."""

    def __init__(self, max_requests: int = 30, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.request_history: Dict[str, List[float]] = {}

    def is_rate_limited(self, client_ip: str) -> Tuple[bool, int]:
        now = time.time()
        cutoff = now - self.window_seconds

        history = [ts for ts in self.request_history.get(client_ip, []) if ts > cutoff]

        if len(history) >= self.max_requests:
            logger.warning(
                "[RateLimiter] RATE LIMIT EXCEEDED for IP '%s': %d requests in %ds",
                client_ip,
                len(history),
                self.window_seconds,
            )
            self.request_history[client_ip] = history
            return True, len(history)

        if len(self.request_history) >= _MAX_TRACKED_KEYS:
            self._prune_expired(cutoff)
            history = [ts for ts in self.request_history.get(client_ip, []) if ts > cutoff]

        history.append(now)
        self.request_history[client_ip] = history
        return False, len(history)

    def _prune_expired(self, cutoff: float) -> None:
        """Drop keys whose entire window has expired (memory bound only)."""
        expired = [
            key
            for key, stamps in self.request_history.items()
            if not any(ts > cutoff for ts in stamps)
        ]
        for key in expired:
            self.request_history.pop(key, None)

    def reset(self) -> None:
        """Clear all history (for tests)."""
        self.request_history.clear()


ai_rate_limiter = SlidingWindowRateLimiter(max_requests=30, window_seconds=60)

global_api_limiter = SlidingWindowRateLimiter(
    max_requests=int(os.getenv("RATE_LIMIT_API_PER_MINUTE") or 100),
    window_seconds=60,
)


def should_skip_rate_limit(path: str) -> bool:
    return path in SKIPPED_PATHS or path.startswith(SKIPPED_PREFIXES)


def client_ip_from_scope(scope: dict) -> str:
    """Proxy-aware client IP from an ASGI scope (same order as get_real_ip)."""
    headers: Dict[str, str] = {}
    for name, value in scope.get("headers", []):
        headers[name.decode("latin-1").lower()] = value.decode("latin-1")

    for key in ("cf-connecting-ip", "x-real-ip"):
        candidate = headers.get(key, "").strip()
        if candidate:
            return candidate

    forwarded = headers.get("x-forwarded-for", "").strip()
    if forwarded:
        candidate = forwarded.split(",")[0].strip()
        if candidate:
            return candidate

    client = scope.get("client")
    if client and client[0]:
        return client[0]
    return "unknown"


class GlobalRateLimitMiddleware:
    """ASGI middleware: per-IP sliding window on every HTTP request.

    Outermost shield — returns 429 before body parsing, auth, or route handlers.
    """

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope.get("type") != "http":
            return await self.app(scope, receive, send)

        path = scope.get("path", "")
        if should_skip_rate_limit(path):
            return await self.app(scope, receive, send)

        ip = client_ip_from_scope(scope)
        limited, _ = global_api_limiter.is_rate_limited(ip)
        if limited:
            response = JSONResponse(
                {"detail": "Too many requests. Please try again shortly."},
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            )
            response.headers["Retry-After"] = str(global_api_limiter.window_seconds)
            return await response(scope, receive, send)

        return await self.app(scope, receive, send)


async def rate_limit_ai_requests(request: Request):
    """FastAPI Dependency for rate limiting AI endpoints."""
    client_ip = request.client.host if request.client else "127.0.0.1"
    is_limited, req_count = ai_rate_limiter.is_rate_limited(client_ip)

    if is_limited:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=(
                "Too many AI requests. Rate limit exceeded "
                "(30 requests/min). Please try again shortly."
            ),
        )

