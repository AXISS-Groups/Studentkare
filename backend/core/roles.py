"""
roles.py — Single source of truth for all role definitions, permissions, and labels.
Import this instead of hardcoding role strings everywhere.

Usage:
    from core.roles import Role, Perm, require_admin, is_admin, get_role_label

    user = await require_admin(authorization)  # raises 401/403 if not admin
    if is_admin(user):
        # admin-only logic
    label = get_role_label(user)
"""

from typing import Dict, List, Optional, Literal, Set
from fastapi import HTTPException, Header
import jwt as _jwt
import os
from datetime import datetime, timezone
def _get_db():
    from core.db import db
    return db

_JWT_SECRET = os.environ.get("JWT_SECRET", "")
_JWT_ALG = os.environ.get("JWT_ALGORITHM", "HS256")


# ═══════════════════════════════════════════════════════════════════════
# 1. CANONICAL ROLE STRINGS — single source of truth
# ═══════════════════════════════════════════════════════════════════════

class Role:
    """Canonical role constants — use these instead of hardcoded strings."""
    STUDENT = "student"
    ALUMNI = "alumni"
    MENTOR = "mentor"
    COLLEGE = "college"
    COLLEGE_ADMIN = "college_admin"
    ADMIN = "admin"
    SUPPORT = "support"

    ALL = {STUDENT, ALUMNI, MENTOR, COLLEGE, COLLEGE_ADMIN, ADMIN, SUPPORT}
    PORTAL_ROLES = {STUDENT, ALUMNI, MENTOR, COLLEGE, ADMIN}
    NON_STUDENT = {ALUMNI, MENTOR, COLLEGE, ADMIN}


# ═══════════════════════════════════════════════════════════════════════
# 2. PERMISSION CATALOG
# ═══════════════════════════════════════════════════════════════════════

class Perm:
    """Permission ID constants."""
    USERS_VIEW = "users.view"
    USERS_EDIT = "users.edit"
    USERS_DELETE = "users.delete"
    USERS_EXPORT = "users.export"
    COLLEGES_VIEW = "colleges.view"
    COLLEGES_MANAGE = "colleges.manage"
    MENTORS_APPROVE = "mentors.approve"
    EVENTS_CREATE = "events.create"
    EVENTS_DELETE = "events.delete"
    PAYMENTS_VIEW = "payments.view"
    PAYMENTS_REFUND = "payments.refund"
    ANALYTICS_VIEW = "analytics.view"
    SETTINGS_MANAGE = "settings.manage"
    ROLES_MANAGE = "roles.manage"
    MARKETPLACE_INSTALL = "marketplace.install"
    AI_RUN = "ai.run"

    ALL = {
        USERS_VIEW, USERS_EDIT, USERS_DELETE, USERS_EXPORT,
        COLLEGES_VIEW, COLLEGES_MANAGE,
        MENTORS_APPROVE,
        EVENTS_CREATE, EVENTS_DELETE,
        PAYMENTS_VIEW, PAYMENTS_REFUND,
        ANALYTICS_VIEW,
        SETTINGS_MANAGE, ROLES_MANAGE, MARKETPLACE_INSTALL,
        AI_RUN,
    }

    GROUPS: Dict[str, List[str]] = {
        "Users": [USERS_VIEW, USERS_EDIT, USERS_DELETE, USERS_EXPORT],
        "Colleges": [COLLEGES_VIEW, COLLEGES_MANAGE],
        "Mentors": [MENTORS_APPROVE],
        "Events": [EVENTS_CREATE, EVENTS_DELETE],
        "Payments": [PAYMENTS_VIEW, PAYMENTS_REFUND],
        "Analytics": [ANALYTICS_VIEW],
        "Settings": [SETTINGS_MANAGE, ROLES_MANAGE, MARKETPLACE_INSTALL],
        "AI": [AI_RUN],
    }


# ═══════════════════════════════════════════════════════════════════════
# 3. SYSTEM ROLE DEFINITIONS
# ═══════════════════════════════════════════════════════════════════════

SYSTEM_ROLES: List[Dict] = [
    {
        "key": "super_admin",
        "name": "Super Admin",
        "description": "Full platform access. Cannot be edited.",
        "permissions": list(Perm.ALL),
        "is_system": True,
    },
    {
        "key": "college_admin",
        "name": "College Admin",
        "description": "Manages students and events for one college.",
        "permissions": [
            Perm.USERS_VIEW, Perm.USERS_EDIT,
            Perm.COLLEGES_VIEW,
            Perm.EVENTS_CREATE, Perm.EVENTS_DELETE,
            Perm.ANALYTICS_VIEW,
        ],
        "is_system": True,
    },
    {
        "key": "mentor",
        "name": "Mentor",
        "description": "Provides mentorship + workshops.",
        "permissions": [
            Perm.USERS_VIEW,
            Perm.EVENTS_CREATE,
            Perm.ANALYTICS_VIEW,
        ],
        "is_system": True,
    },
    {
        "key": "support",
        "name": "Support Agent",
        "description": "Read-only with limited mutate rights.",
        "permissions": [
            Perm.USERS_VIEW,
            Perm.PAYMENTS_VIEW,
            Perm.ANALYTICS_VIEW,
        ],
        "is_system": True,
    },
]


# ═══════════════════════════════════════════════════════════════════════
# 4. DISPLAY LABELS
# ═══════════════════════════════════════════════════════════════════════

ROLE_LABELS: Dict[str, str] = {
    Role.STUDENT: "Student",
    Role.ALUMNI: "Alumni",
    Role.MENTOR: "Mentor",
    Role.COLLEGE: "College",
    Role.COLLEGE_ADMIN: "College Admin",
    Role.ADMIN: "Admin",         # use get_role_label() for Super Admin check
    Role.SUPPORT: "Support Agent",
}

ROLE_COLORS: Dict[str, str] = {
    Role.STUDENT: "#A78BFA",
    Role.ALUMNI: "#A78BFA",
    Role.MENTOR: "#F59E0B",
    Role.COLLEGE: "#22D3EE",
    Role.COLLEGE_ADMIN: "#22D3EE",
    Role.ADMIN: "#10B981",
    Role.SUPPORT: "#94A3B8",
}


# ═══════════════════════════════════════════════════════════════════════
# 5. HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════

def get_role(user: dict) -> str:
    """Safely extract role from user dict, defaulting to student."""
    return (user.get("role") or Role.STUDENT).lower().strip()


def is_super_admin(user: dict) -> bool:
    """Check if user is a super admin (platform owner)."""
    return get_role(user) == Role.ADMIN and user.get("is_super_admin", False)


def is_admin(user: dict) -> bool:
    """Check if user has admin-level access (any admin type)."""
    return get_role(user) == Role.ADMIN


def get_role_label(user: dict) -> str:
    """Get display label for user's role."""
    role = get_role(user)
    if role == Role.ADMIN and is_super_admin(user):
        return "Super Admin"
    return ROLE_LABELS.get(role, role.capitalize())


def get_role_color(user: dict) -> str:
    """Get display color for user's role status."""
    return ROLE_COLORS.get(get_role(user), "#A78BFA")


def has_permission(user: dict, permission: str) -> bool:
    """Check if user has a specific permission (from their role definition).
    NOTE: This is a STUB — the permission system is not yet wired to access control.
    Currently, all admins have full access, and other roles have role-based gates."""
    role = get_role(user)
    if role == Role.ADMIN:
        return True  # Admins have all permissions
    # Look up from DB role definition
    return False


def user_portal_route(user: dict) -> str:
    """Get the correct portal route for a user based on their role."""
    role = get_role(user)
    routes = {
        Role.ADMIN: "/super-admin",
        Role.COLLEGE: "/college-portal",
        Role.MENTOR: "/mentor-portal",
        Role.ALUMNI: "/alumni-portal",
        Role.STUDENT: "/student-portal",
    }
    return routes.get(role, "/student-portal")


# ═══════════════════════════════════════════════════════════════════════
# 6. AUTHENTICATION HELPERS
# ═══════════════════════════════════════════════════════════════════════

async def _resolve_user(authorization: Optional[str]) -> Optional[dict]:
    """Decode JWT and return user doc from DB."""
    if not authorization:
        return None
    token = authorization.replace("Bearer ", "")
    try:
        payload = _jwt.decode(token, _JWT_SECRET, algorithms=[_JWT_ALG])
        user_id = payload.get("sub")
        if not user_id:
            return None
        from bson.objectid import ObjectId
        return await _get_db().users.find_one({"_id": ObjectId(user_id)})
    except Exception:
        return None


async def require_admin(authorization: Optional[str] = Header(None)) -> dict:
    """Unified FastAPI dependency: ensures user is authenticated as admin.
    Usage: user = await require_admin(authorization)"""
    if not authorization:
        raise HTTPException(401, "Not authenticated")
    user = await _resolve_user(authorization)
    if not user:
        raise HTTPException(401, "Invalid token or user not found")
    role = (user.get("role") or "").lower().strip()
    if role != Role.ADMIN:
        raise HTTPException(403, "Admin access required")
    return user


async def require_super_admin(authorization: Optional[str] = Header(None)) -> dict:
    """Like require_admin but also checks is_super_admin flag.
    Use for sensitive operations: settings, roles, marketplace."""
    user = await require_admin(authorization)
    if not user.get("is_super_admin"):
        raise HTTPException(403, "Super admin access required")
    return user


# ═══════════════════════════════════════════════════════════════════════
# 7. SEED SYSTEM ROLES INTO DATABASE
# ═══════════════════════════════════════════════════════════════════════

async def seed_admin_roles(db=None):
    """Ensure all system roles exist in admin_roles collection.
    Call on startup or via migration. Uses $setOnInsert for idempotency.
    If db is provided, uses it; otherwise creates its own connection."""
    target_db = db or _get_db()
    for role_def in SYSTEM_ROLES:
        await target_db.admin_roles.update_one(
            {"key": role_def["key"]},
            {"$setOnInsert": {
                "key": role_def["key"],
                "name": role_def["name"],
                "description": role_def["description"],
                "permissions": role_def["permissions"],
                "is_system": role_def["is_system"],
                "created_at": datetime.now(timezone.utc),
            }},
            upsert=True,
        )
    print(f"✅ Seeded {len(SYSTEM_ROLES)} system roles to admin_roles collection")
