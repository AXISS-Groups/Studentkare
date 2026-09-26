"""
core.security — JWT, bcrypt, encryption, audit log helpers.

Single source of truth for authentication primitives shared by server.py
and routers/*. None of these functions take `db` directly — audit helpers
import the global `db` from core.db at call time so this module stays
import-cycle-free.
"""
import base64
import io
import os
import secrets
import string
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
import jwt
import qrcode

try:
    from cryptography.fernet import Fernet, InvalidToken
    _HAS_CRYPTOGRAPHY = True
except Exception:
    _HAS_CRYPTOGRAPHY = False
    class Fernet:
        @staticmethod
        def generate_key():
            return b"dummy_key_for_dev_booting_without_cryptography_32b_len="
        def __init__(self, key):
            pass
        def encrypt(self, data: bytes) -> bytes:
            return data
        def decrypt(self, data: bytes) -> bytes:
            return data
    class InvalidToken(Exception):
        pass

from .db import db

# ─── JWT configuration ─────────────────────────────────────────────────
JWT_SECRET = os.environ.get("JWT_SECRET")
if not JWT_SECRET or JWT_SECRET == "change_me_to_a_long_random_secret":  # noqa: S105 — the placeholder being rejected, not a secret
    # A random per-boot secret rather than a shared default: nothing signed with
    # a key in the source can be trusted. The cost is that sessions do not survive
    # a restart and replicas cannot validate each other's tokens, so a real
    # deployment must set JWT_SECRET.
    JWT_SECRET = secrets.token_hex(32)

JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60  # 1 hour — short-lived; use refresh token for re-auth
REFRESH_TOKEN_EXPIRE_DAYS = 30


# ─── Fernet encryption-at-rest ─────────────────────────────────────────
_FERNET_KEY = os.environ.get("FERNET_KEY")
if not _FERNET_KEY:
    try:
        _FERNET_KEY = Fernet.generate_key().decode() if _HAS_CRYPTOGRAPHY else "dummy_key_for_dev_booting_without_cryptography_32b_len="
    except Exception:
        _FERNET_KEY = "dummy_key_for_dev_booting_without_cryptography_32b_len="
_FERNET = Fernet(_FERNET_KEY.encode() if isinstance(_FERNET_KEY, str) else _FERNET_KEY)
_ENC_PREFIX = "enc::"


def encrypt_value(plain: Optional[str]) -> Optional[str]:
    """Wrap a string with a Fernet token + recognisable prefix."""
    if plain is None or plain == "":
        return plain
    if isinstance(plain, str) and plain.startswith(_ENC_PREFIX):
        return plain
    try:
        token = _FERNET.encrypt(plain.encode("utf-8")).decode("utf-8")
        return f"{_ENC_PREFIX}{token}"
    except Exception:
        return plain


def decrypt_value(value: Optional[str]) -> Optional[str]:
    """Unwrap a Fernet ciphertext (returns input unchanged if not ours)."""
    if value is None or value == "":
        return value
    if isinstance(value, str) and value.startswith(_ENC_PREFIX):
        try:
            return _FERNET.decrypt(value[len(_ENC_PREFIX):].encode("utf-8")).decode("utf-8")
        except (InvalidToken, ValueError):
            return None  # Returns None for bad tokens — caller must handle
        except Exception:
            return None
    return value  # legacy plaintext


# ─── Password helpers ──────────────────────────────────────────────────
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


# ─── JWT token helpers ─────────────────────────────────────────────────
def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
        "type": "refresh",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


# ─── Unique ID + QR helpers ────────────────────────────────────────────
def generate_unique_id(role: str) -> str:
    """Format: SA-{YEAR}-{ROLE_CODE}-{6 random}. Used as QR payload."""
    role_codes = {"student": "STU", "alumni": "ALM", "mentor": "MNT", "college": "CLG", "admin": "ADM"}
    code = role_codes.get(role, "USR")
    # secrets, not random: this is a QR payload, and a Mersenne Twister is
    # predictable from a handful of observed outputs.
    alphabet = string.ascii_uppercase + string.digits
    rand = ''.join(secrets.choice(alphabet) for _ in range(6))
    return f"SA-{datetime.now().year}-{code}-{rand}"


def generate_qr_code(data: str) -> str:
    """Generate a base64 PNG QR code (brand-purple foreground)."""
    qr = qrcode.QRCode(version=1, box_size=10, border=2,
                       error_correction=qrcode.constants.ERROR_CORRECT_M)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#5F259F", back_color="#FFFFFF")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("utf-8")


# ─── Audit log helpers ─────────────────────────────────────────────────
async def _audit_log(user_id: str, field: str, old_value, new_value, *,
                     source: str = "onboarding",
                     validation_status: str = "passed",
                     is_manual_entry: bool = False) -> None:
    """Best-effort single audit log insert. Never raises."""
    try:
        await db.audit_logs.insert_one({
            "user_id": user_id,
            "field_name": field,
            "old_value": old_value if old_value is not None else None,
            "new_value": new_value if new_value is not None else None,
            "source": source,
            "validation_status": validation_status,
            "is_manual_entry": bool(is_manual_entry),
            "ts": datetime.now(timezone.utc),
        })
    except Exception:
        pass


async def _audit_log_many(user_id: str, source: str, entries: list,
                          validation_status: str = "passed") -> None:
    """Bulk insert audit entries. `entries` is a list of (field, old, new) tuples."""
    if not entries:
        return
    try:
        docs = [{
            "user_id": user_id,
            "field_name": f,
            "old_value": o,
            "new_value": n,
            "source": source,
            "validation_status": validation_status,
            "is_manual_entry": False,
            "ts": datetime.now(timezone.utc),
        } for (f, o, n) in entries if n is not None and n != ""]
        if docs:
            await db.audit_logs.insert_many(docs, ordered=False)
    except Exception:
        pass




# ─── User serialization ────────────────────────────────────────────────
def _safe_block(model_cls, value):
    """Coerce a stored dict into a Pydantic model; return None on failure."""
    if value is None:
        return None
    try:
        return model_cls(**value).model_dump(exclude_none=False)
    except Exception:
        return None


def serialize_user(user: dict) -> dict:
    """Strip internal fields and decrypt at-rest sensitive data for API responses."""
    if not user:
        return None
    # Late import to avoid circular dependency at module load time
    from .models import AlumniInfo, CollegeInfo, MentorInfo, SchoolInfo, StudentInfo
    return {
        "id": str(user.get("_id")),
        "email": user.get("email"),
        "full_name": user.get("full_name"),
        "role": user.get("role"),
        "phone":        decrypt_value(user.get("phone")),
        "unique_id": user.get("unique_id"),
        "qr_code_base64": user.get("qr_code_base64"),
        "school_info":  _safe_block(SchoolInfo,  user.get("school_info")),
        "career_path":  user.get("career_path") if user.get("career_path") in ["job", "higher_education", "startup", "business"] else None,
        "student_info": _safe_block(StudentInfo, user.get("student_info")),
        "alumni_info":  _safe_block(AlumniInfo,  user.get("alumni_info")),
        "mentor_info":  _safe_block(MentorInfo,  user.get("mentor_info")),
        "college_info": _safe_block(CollegeInfo, user.get("college_info")),
        "mentor_status": user.get("mentor_status"),
        "interests": user.get("interests", []),
        "skills": user.get("skills", []),
        "bio": user.get("bio"),
        "face_image_base64": user.get("face_image_base64"),
        "onboarding_completed": user.get("onboarding_completed", False),
        "two_fa_enabled": user.get("two_fa_enabled", False),
        "dob":          decrypt_value(user.get("dob")),
        "country_code": user.get("country_code"),
        "postal_code":  decrypt_value(user.get("postal_code")),
        "created_at": user.get("created_at"),
        "first_name":     user.get("first_name"),
        "last_name":      user.get("last_name"),
        "headline":       user.get("headline"),
        "photo_data":     user.get("face_image_base64") or user.get("photo_data") or user.get("oauth_picture"),
        "banner_data":    user.get("banner_data"),
        "college_logo_data": user.get("college_logo_data"),
        "institution":    user.get("institution") or (user.get("school_info") or {}).get("institution_name") or (user.get("alumni_info") or {}).get("institution_name") or (user.get("college_info") or {}).get("institution_name"),
        "branch":         user.get("branch") or (user.get("school_info") or {}).get("branch_or_stream"),
        "stream":         user.get("stream"),
        "department":     user.get("department"),
        "graduation_year": user.get("graduation_year") or (user.get("school_info") or {}).get("graduation_year") or (user.get("alumni_info") or {}).get("graduation_year"),
        "cgpa":           user.get("cgpa") or (user.get("school_info") or {}).get("cgpa"),
        "location":       user.get("location"),
        "city":           user.get("city") or (user.get("school_info") or {}).get("city") or (user.get("college_info") or {}).get("city"),
        "state":          user.get("state") or (user.get("school_info") or {}).get("state") or (user.get("college_info") or {}).get("state"),
        "linkedin_url":   user.get("linkedin_url"),
        "github_url":     user.get("github_url"),
        "portfolio_url":  user.get("portfolio_url"),
        "primary_skill":  user.get("primary_skill"),
        "profile_visibility": user.get("profile_visibility"),
        "section_toggles": user.get("section_toggles"),
        "badges":         [b for b in user.get("badges", []) if isinstance(b, dict)],
        "projects":       user.get("projects"),
        "preferences":    user.get("preferences"),
        "is_verified":    user.get("is_verified"),
        "ranking_tier":   user.get("ranking_tier"),
        # Identity & DigiLocker
        "aadhaar_number": user.get("aadhaar_number"),
        "aadhaar_masked": user.get("aadhaar_masked") or (f"•••• •••• {str(user.get('aadhaar_number'))[-4:]}" if user.get("aadhaar_number") and len(str(user.get("aadhaar_number")).replace(" ","")) >= 4 else None),
        "aadhaar_verified": bool(user.get("aadhaar_verified", False)),
        "digilocker_id": user.get("digilocker_id"),
        "digilocker_verified": bool(user.get("digilocker_verified", False)),
        "digilocker_doc_count": int(user.get("digilocker_doc_count", 0)),
        "digilocker_uri": user.get("digilocker_uri"),
        "digilocker_linked_at": user.get("digilocker_linked_at"),
    }


def validate_student_class(school_info, age: Optional[int] = None) -> None:
    """Per spec: students must be age 10+ AND in Class 11 (+1) or above."""
    from fastapi import HTTPException
    if age is not None and age < 10:
        raise HTTPException(400, "Students must be at least 10 years old to register.")
    cls = (school_info.class_or_year or "").strip().lower()
    if cls.isdigit() and int(cls) < 11:
        raise HTTPException(400, "Students must be in Class 11 (+1) or above.")


__all__ = [
    'JWT_SECRET', 'JWT_ALGORITHM', 'ACCESS_TOKEN_EXPIRE_MINUTES', 'REFRESH_TOKEN_EXPIRE_DAYS',
    'encrypt_value', 'decrypt_value',
    'hash_password', 'verify_password',
    'create_access_token', 'create_refresh_token',
    'generate_unique_id', 'generate_qr_code',
    '_audit_log', '_audit_log_many',
    'serialize_user', 'validate_student_class', '_safe_block',
]
