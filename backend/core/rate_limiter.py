"""
backend/core/rate_limiter.py

Sliding-Window Rate Limiting Middleware for AI Endpoints.
Prevents API key quota exhaustion, DDoS attacks, and abuse on /api/ai/* endpoints.
"""

import logging
import time
from typing import Dict, List, Tuple

from fastapi import HTTPException, Request, status

logger = logging.getLogger("rate_limiter")


class SlidingWindowRateLimiter:
    """In-memory sliding window rate limiter for API endpoints."""

    def __init__(self, max_requests: int = 30, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.request_history: Dict[str, List[float]] = {}

    def is_rate_limited(self, client_ip: str) -> Tuple[bool, int]:
        now = time.time()
        cutoff = now - self.window_seconds

        # Clean old timestamps
        history = [ts for ts in self.request_history.get(client_ip, []) if ts > cutoff]

        if len(history) >= self.max_requests:
            logger.warning(f"[RateLimiter] RATE LIMIT EXCEEDED for IP '{client_ip}': {len(history)} requests in {self.window_seconds}s")
            self.request_history[client_ip] = history
            return True, len(history)

        history.append(now)
        self.request_history[client_ip] = history
        return False, len(history)


ai_rate_limiter = SlidingWindowRateLimiter(max_requests=30, window_seconds=60)


async def rate_limit_ai_requests(request: Request):
    """FastAPI Dependency for rate limiting AI endpoints."""
    client_ip = request.client.host if request.client else "127.0.0.1"
    is_limited, req_count = ai_rate_limiter.is_rate_limited(client_ip)

    if is_limited:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many AI requests. Rate limit exceeded (30 requests/min). Please try again shortly."
        )
