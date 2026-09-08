"""
core.deps — FastAPI dependencies (currently: JWT auth `get_current_user`).
"""
import jwt
from bson import ObjectId
from fastapi import HTTPException, Request, Depends

from .db import db
from .security import JWT_SECRET, JWT_ALGORITHM


async def get_current_user(request: Request) -> dict:
    """JWT auth dependency. Reads `Authorization: Bearer <token>` header."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(auth[7:], JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(401, "Invalid token type")
        # Exclude large binary/base64 fields to minimize payload size & latency on auth lookup
        user = await db.users.find_one(
            {"_id": ObjectId(payload["sub"])}
        )
        if not user:
            raise HTTPException(401, "User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")


def require_role(*allowed_roles: str):
    """Factory that returns a dependency enforcing role-based access control."""
    async def role_checker(user: dict = Depends(get_current_user)) -> dict:
        user_role = (user.get("role") or "").lower()
        if user_role not in [r.lower() for r in allowed_roles] and user_role != "admin":
            # Admin role bypasses role checks by default in this system's design
            raise HTTPException(403, "Insufficient privileges")
        return user
    return role_checker

__all__ = ['get_current_user', 'require_role']
