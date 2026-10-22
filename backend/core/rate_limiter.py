"""
backend/core/rate_limiter.py

Sliding-window rate limiting.

Global shield (this file, wired as ASGI middleware in app/main.py), two budgets
checked on every HTTP request before routes or auth:
    - per signed-in session (the session cookie), so students sharing one campus
      NAT address no longer share one budget:
      platform.api_rate_per_account_per_minute (default 300 per 60s);
    - per client IP, a much higher ceiling every request counts against, signed
      in or not: platform.api_rate_per_ip_per_minute (default 3000 per 60s).
    Both come from the settings registry; RATE_LIMIT_API_PER_ACCOUNT_PER_MINUTE /
    RATE_LIMIT_API_PER_IP_PER_MINUTE in the environment pin them for one
    deployment. Skips liveness/docs paths so monitors never self-DoS.
    Unauthenticated endpoints (sign-in, OTP send/verify, passcode, PIN) keep their
    own strict per-identifier and per-IP limits in services/*; nothing here
    loosens them.

Known limits (stated, not hidden):
    - In-memory and per process; with N replicas a client gets N budgets. The
      auth limits that matter (OTP send/verify) are Postgres-backed in
      services.workflow_auth.limit and hold across replicas.
    - The session bucket is keyed on a hash of the session cookie without a
      database look-up, so it stays cheap and runs before auth. A made-up cookie
      only gets a bucket of its own, and every request still counts against the
      per-IP ceiling, so forging cookies buys nothing beyond the ceiling.
    - The IP ceiling stops single-source floods, not distributed botnets.
    - Per-route AI limits keyed by user id are not in this layer (later work).

Client address: the peer address the ASGI server resolved, nothing else. The
backend runs uvicorn with --proxy-headers --forwarded-allow-ips=<proxy CIDRs>
(backend/Dockerfile, FORWARDED_ALLOW_IPS), which takes the right-most
X-Forwarded-For hop that is not a trusted proxy and only when the request came
from one. Headers a client can set itself (CF-Connecting-IP, X-Real-IP, the
left-most X-Forwarded-For) are never trusted here: they let anyone pick their
own bucket (audit TD-10).
"""

import hashlib
import logging
import os
import time
from typing import Callable, Dict, List, Optional, Tuple

from fastapi import HTTPException, Request, status
from starlette.responses import JSONResponse

logger = logging.getLogger("rate_limiter")

# Liveness and docs must never 429 — uptime probes would look like an outage.
# Logout must never 429 either: it only removes access, and a student on shared
# campus wifi (one NAT IP) must always be able to end a session on a shared device.
SKIPPED_PATHS = frozenset({"/api/health", "/api/info", "/api/auth/logout"})
SKIPPED_PREFIXES = ("/docs", "/openapi", "/redoc", "/static")

# Opportunistic bound so abandoned client keys cannot grow the dict forever.
_MAX_TRACKED_KEYS = 10000


class SlidingWindowRateLimiter:
    """In-memory sliding window rate limiter for API endpoints."""

    def __init__(self, max_requests: Optional[int] = 30, window_seconds: int = 60,
                 limit_source: Optional[Callable[[], int]] = None, label: str = "IP"):
        # max_requests, when set, wins (tests set it); otherwise limit_source is read.
        self.max_requests = max_requests
        self.limit_source = limit_source
        self.window_seconds = window_seconds
        self.label = label
        self.request_history: Dict[str, List[float]] = {}

    def limit(self) -> int:
        if self.max_requests is not None:
            return self.max_requests
        if self.limit_source is None:
            raise RuntimeError("rate limiter has neither max_requests nor limit_source")
        return self.limit_source()

    def is_rate_limited(self, client_ip: str) -> Tuple[bool, int]:
        now = time.time()
        cutoff = now - self.window_seconds

        # Clean old timestamps
        history = [ts for ts in self.request_history.get(client_ip, []) if ts > cutoff]

        if len(history) >= self.limit():
            # Session keys are hashes; never log a raw cookie.
            logger.warning(
                "[RateLimiter] RATE LIMIT EXCEEDED for %s '%s': %d requests in %ds",
                self.label,
                client_ip if self.label == "IP" else client_ip[:12],
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


# PR2 will add tighter, user-scoped limiters alongside this one.
ai_rate_limiter = SlidingWindowRateLimiter(max_requests=30, window_seconds=60)


def _configured_limit(env_name: str, setting_key: str) -> Callable[[], int]:
    """The deployment's pinned value when the env var is a positive whole number,
    else the settings registry (a super admin's override or the declared default),
    read from the registry's cache so this middleware never queries the database."""
    def read() -> int:
        raw = (os.getenv(env_name) or "").strip()
        if raw.isdigit() and int(raw) > 0:
            return int(raw)
        from core.settings_registry import cached_setting
        return int(cached_setting(setting_key))
    return read


# Ceiling per client IP: every request counts, signed in or not.
global_api_limiter = SlidingWindowRateLimiter(
    max_requests=None,
    window_seconds=60,
    limit_source=_configured_limit("RATE_LIMIT_API_PER_IP_PER_MINUTE", "platform.api_rate_per_ip_per_minute"),
    label="IP",
)

# Budget per signed-in session, so many students behind one campus NAT address
# each get their own.
account_api_limiter = SlidingWindowRateLimiter(
    max_requests=None,
    window_seconds=60,
    limit_source=_configured_limit("RATE_LIMIT_API_PER_ACCOUNT_PER_MINUTE",
                                   "platform.api_rate_per_account_per_minute"),
    label="session",
)

# The session cookie name lives in services.workflow_auth; importing that module
# here would pull the whole auth stack into the outermost middleware.
SESSION_COOKIE_NAME = b"sacare_session"


def should_skip_rate_limit(path: str) -> bool:
    return path in SKIPPED_PATHS or path.startswith(SKIPPED_PREFIXES)


def client_ip_from_scope(scope: dict) -> str:
    """The client address the ASGI server resolved from trusted proxies only."""
    client = scope.get("client")
    if client and client[0]:
        return client[0]
    return "unknown"


def session_key_from_scope(scope: dict) -> Optional[str]:
    """A hash of the session cookie, or None when the request carries none."""
    for name, value in scope.get("headers") or []:
        if name.lower() != b"cookie":
            continue
        for part in value.split(b";"):
            key, _, raw = part.strip().partition(b"=")
            if key == SESSION_COOKIE_NAME and raw:
                return hashlib.sha256(raw).hexdigest()
    return None


def _too_many(limiter: SlidingWindowRateLimiter) -> JSONResponse:
    response = JSONResponse(
        {"detail": "Too many requests. Please try again shortly."},
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
    )
    response.headers["Retry-After"] = str(limiter.window_seconds)
    return response


class GlobalRateLimitMiddleware:
    """ASGI middleware: per-session budget and per-IP ceiling on every HTTP request.

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
            return await _too_many(global_api_limiter)(scope, receive, send)

        session_key = session_key_from_scope(scope)
        if session_key is not None:
            limited, _ = account_api_limiter.is_rate_limited(session_key)
            if limited:
                return await _too_many(account_api_limiter)(scope, receive, send)

        return await self.app(scope, receive, send)


async def rate_limit_ai_requests(request: Request):
    """FastAPI Dependency for rate limiting AI endpoints (PR2 wiring pending)."""
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
