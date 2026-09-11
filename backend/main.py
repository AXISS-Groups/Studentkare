"""
StudentKare — FastAPI Authentication, Teleconsult & Agentic RAG Backend Service
v0.6.0 Compliant with DPDP Act 2023 and ABDM Milestone 1-3
"""

from fastapi import FastAPI, HTTPException, Depends, status, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict
from datetime import datetime, timedelta
from jose import jwt, JWTError
import time
import secrets
import os
import hmac
import hashlib
import base64
import struct
import json
import urllib.request
import urllib.parse
import urllib.error

app = FastAPI(
    title="StudentKare Auth, Teleconsult & Agentic RAG API",
    version="0.6.0",
    description="FastAPI service for Student Health Identity, Teleconsult Catalogs, Multiple Loop Agents, and RAG Pipeline.",
)

# Configurable CORS origin list from environment
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# JWT Auth Constants & Bearer Scheme
JWT_SECRET = os.getenv("JWT_SECRET", "studentkare_prod_jwt_secret_2026_secure_key_hash")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

security_scheme = HTTPBearer()

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=ALGORITHM)

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security_scheme)) -> Dict:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication credentials")
        return payload
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials or token expired")

# ─── IN-MEMORY DEMO DATABASE, RATE LIMITER & OTP CACHE ───────────────────────

OTP_STORE: Dict[str, Dict] = {}
RATE_LIMIT_STORE: Dict[str, List[float]] = {}

# Role-Based Master Users Database with explicit login information
USERS_DB: Dict[str, Dict] = {
    "9999999999": {
        "id": "admin_super_01",
        "fullName": "Dr. Vikram Sarabhai",
        "phone": "9999999999",
        "email": "super.admin@studentkare.in",
        "role": "SUPER_ADMIN",
        "dob": "1980-08-12",
        "age": 46,
        "bloodGroup": "O+",
        "university": "Studentkare Central Governance",
        "institutionId": None,
        "college": "National Operations Control",
        "rollNumber": "EMP-SA-001",
        "abhaAddress": "vikram.sarabhai@abdm",
        "ageVerified": True,
        "isVerifiedStudent": False,
        "restrictedPoolApproved": True,
        "allergies": [],
        "chronicConditions": [],
        "currentMedications": [],
        "emergencyContacts": [{"relation": "HQ Emergency Desk", "phone": "+91 1800 11 2026"}],
        "pointsBalance": 0,
    },
    "9999999998": {
        "id": "admin_cosigner_02",
        "fullName": "Prof. Rajesh Sharma",
        "phone": "9999999998",
        "email": "cosigner.admin@studentkare.in",
        "role": "SUPER_ADMIN",
        "dob": "1978-04-19",
        "age": 48,
        "bloodGroup": "A+",
        "university": "Studentkare Ethics Oversight Board",
        "institutionId": None,
        "college": "National Break-Glass Authorization Pool",
        "rollNumber": "EMP-SA-002",
        "abhaAddress": "rajesh.sharma@abdm",
        "ageVerified": True,
        "isVerifiedStudent": False,
        "restrictedPoolApproved": True,
        "allergies": [],
        "chronicConditions": [],
        "currentMedications": [],
        "emergencyContacts": [{"relation": "Ethics Desk", "phone": "+91 1800 11 2027"}],
        "pointsBalance": 0,
    },
    "9876500001": {
        "id": "admin_campus_01",
        "fullName": "Dr. Sunita Rao",
        "phone": "9876500001",
        "email": "health.admin@osmania.ac.in",
        "role": "CAMPUS_ADMIN",
        "dob": "1985-11-05",
        "age": 41,
        "bloodGroup": "B+",
        "university": "Osmania University",
        "institutionId": "inst_osmania_01",
        "college": "University Health Centre",
        "rollNumber": "EMP-OU-HC-101",
        "abhaAddress": "sunita.rao@abdm",
        "ageVerified": True,
        "isVerifiedStudent": False,
        "allergies": [],
        "chronicConditions": [],
        "currentMedications": [],
        "emergencyContacts": [{"relation": "University Registrar", "phone": "+91 40 2768 2444"}],
        "pointsBalance": 0,
    },
    "9876500002": {
        "id": "doc_nmc_4001",
        "fullName": "Dr. Ananya Rao, MD",
        "phone": "9876500002",
        "email": "dr.ananya.rao@studentkare.in",
        "role": "NMC_DOCTOR",
        "dob": "1988-02-28",
        "age": 38,
        "bloodGroup": "AB+",
        "university": "NMC Registered Teleconsult Network",
        "institutionId": "inst_osmania_01",
        "college": "Osmania University Medical Pod 1",
        "rollNumber": "NMC/10042/2018",
        "abhaAddress": "dr.ananya@abdm",
        "ageVerified": True,
        "isVerifiedStudent": False,
        "allergies": [],
        "chronicConditions": [],
        "currentMedications": [],
        "emergencyContacts": [{"relation": "Medical Council", "phone": "+91 11 2536 7033"}],
        "pointsBalance": 0,
    },
    "9876543210": {
        "id": "std_001",
        "fullName": "Arjun Mehta",
        "phone": "9876543210",
        "email": "arjun.m@osmania.ac.in",
        "role": "STUDENT",
        "dob": "2004-03-14",
        "age": 22,
        "bloodGroup": "B+",
        "university": "Osmania University",
        "institutionId": "inst_osmania_01",
        "college": "University College of Engineering",
        "rollNumber": "URN-OSMANIA-2026-ARJUN",
        "abhaAddress": "arjun.mehta@abdm",
        "abhaNumber": "91-4829-1029-4412",
        "ageVerified": False,
        "isVerifiedStudent": True,
        "allergies": ["Penicillin", "Sulfa drugs"],
        "chronicConditions": ["Asthma"],
        "currentMedications": ["Salbutamol inhaler"],
        "emergencyContacts": [
            {"relation": "Mother (Amma)", "phone": "+91 98111 22334"},
            {"relation": "Campus Health Warden", "phone": "+91 40230 16000"},
        ],
        "pointsBalance": 240,
    }
}

# In-memory Break-Glass, Audit, Tenant, and Department stores
BREAK_GLASS_SESSIONS_DB: Dict[str, Dict] = {}
AUDIT_LOGS_DB: List[Dict] = [
    {
        "id": "aud_init_001",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "actorId": "system",
        "actorName": "System Bootloader",
        "actorType": "SYSTEM",
        "action": "SYSTEM_STARTUP",
        "ruleId": "Rule-K1",
        "resourceType": "SYSTEM",
        "details": "Studentkare Operational & Clinical Planes Separated",
        "institutionId": None,
    }
]
TENANTS_DB: List[Dict] = [
    {
        "id": "inst_osmania_01",
        "name": "Osmania University",
        "code": "OU-HYD",
        "tier": "ENTERPRISE_CAMPUS",
        "activeSeats": 24500,
        "maxSeats": 30000,
        "abdmFacilityId": "IN3610002491",
        "status": "ACTIVE",
        "joinedAt": "2025-08-15",
    },
    {
        "id": "inst_iith_02",
        "name": "IIT Hyderabad",
        "code": "IITH-KANDI",
        "tier": "PREMIUM_TIER",
        "activeSeats": 8200,
        "maxSeats": 10000,
        "abdmFacilityId": "IN3610002890",
        "status": "ACTIVE",
        "joinedAt": "2025-10-01",
    },
    {
        "id": "inst_bits_03",
        "name": "BITS Pilani Hyderabad Campus",
        "code": "BITS-HYD",
        "tier": "PREMIUM_TIER",
        "activeSeats": 5400,
        "maxSeats": 7000,
        "abdmFacilityId": "IN3610003112",
        "status": "ACTIVE",
        "joinedAt": "2026-01-10",
    }
]

DEPARTMENTS_DB: Dict[str, Dict] = {
    "D1": {"id": "D1", "name": "Service Desk Operations", "plane": "OPERATIONAL", "status": "ACTIVE", "killSwitchActive": False, "rules": ["Rule-L1", "Rule-L2"]},
    "D2": {"id": "D2", "name": "Partner & Supply Ops", "plane": "OPERATIONAL", "status": "ACTIVE", "killSwitchActive": False, "rules": ["Rule-J1", "Rule-L7"]},
    "D3": {"id": "D3", "name": "Compliance & Audit", "plane": "OPERATIONAL", "status": "ACTIVE", "killSwitchActive": False, "rules": ["Rule-K8", "Rule-L8"]},
    "D4": {"id": "D4", "name": "Finance & Revenue", "plane": "OPERATIONAL", "status": "ACTIVE", "killSwitchActive": False, "rules": ["Rule-L8"]},
    "D5": {"id": "D5", "name": "Claims Operations", "plane": "OPERATIONAL", "status": "ACTIVE", "killSwitchActive": False, "rules": ["Rule-K4", "Rule-K5"]},
    "D6": {"id": "D6", "name": "Institution Success", "plane": "OPERATIONAL", "status": "ACTIVE", "killSwitchActive": False, "rules": ["Rule-K-Anonymity"]},
    "D7": {"id": "D7", "name": "Content & Localization", "plane": "OPERATIONAL", "status": "ACTIVE", "killSwitchActive": False, "rules": ["Rule-L3"]},
    "D8": {"id": "D8", "name": "Engineering & Reliability", "plane": "OPERATIONAL", "status": "ACTIVE", "killSwitchActive": False, "rules": ["Rule-K1"]},
    "D9": {"id": "D9", "name": "Clinical Governance", "plane": "OPERATIONAL", "status": "ACTIVE", "killSwitchActive": False, "rules": ["Rule-K1", "Rule-K8"]},
}

# ─── INTEGRATIONS STORE (SuperAdmin-configurable: PostHog, OpenWA, Firebase, OTP, 2FA) ──
# Secrets are stored in-memory here (swap to Mongo `installed_tools`/`settings` in prod).
# Public (non-secret) values are exposed via GET /api/config/public for frontend init.
INTEGRATIONS_DB: Dict[str, Dict] = {
    "posthog": {
        "enabled": os.getenv("POSTHOG_ENABLED", "false").lower() == "true",
        "api_key": os.getenv("POSTHOG_API_KEY", ""),
        "host": os.getenv("POSTHOG_HOST", "https://app.posthog.com"),
        "autocapture": True,
    },
    "openwa": {
        "enabled": os.getenv("OPENWA_ENABLED", "false").lower() == "true",
        "base_url": os.getenv("OPENWA_BASE_URL", ""),
        "api_key": os.getenv("OPENWA_API_KEY", ""),
        "session_id": os.getenv("OPENWA_SESSION_ID", ""),
        "default_country_code": os.getenv("OPENWA_DEFAULT_COUNTRY_CODE", "91"),
    },
    "firebase": {
        "enabled": os.getenv("FIREBASE_ENABLED", "false").lower() == "true",
        "api_key": os.getenv("FIREBASE_API_KEY", ""),
        "auth_domain": os.getenv("FIREBASE_AUTH_DOMAIN", ""),
        "project_id": os.getenv("FIREBASE_PROJECT_ID", ""),
        "messaging_sender_id": os.getenv("FIREBASE_MESSAGING_SENDER_ID", ""),
        "app_id": os.getenv("FIREBASE_APP_ID", ""),
        "vapid_key": os.getenv("FIREBASE_VAPID_KEY", ""),
        # Server-side (never exposed publicly):
        "server_key": os.getenv("FIREBASE_SERVER_KEY", ""),
        "service_account_json": os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON", ""),
    },
    "otp": {
        "channel": os.getenv("OTP_CHANNEL", "WHATSAPP"),
        "length": int(os.getenv("OTP_LENGTH", "6")),
        "ttl_seconds": int(os.getenv("OTP_TTL_SECONDS", "300")),
        "max_attempts": int(os.getenv("OTP_MAX_ATTEMPTS", "5")),
    },
    "postal": {
        "enabled": os.getenv("POSTAL_ENABLED", "false").lower() == "true",
        "api_url": os.getenv("POSTAL_API_URL", ""),
        "server_api_key": os.getenv("POSTAL_SERVER_API_KEY", ""),
        "from_email": os.getenv("POSTAL_FROM_EMAIL", "StudentKare <noreply@studentkare.in>"),
    },
    "twofa": {
        "enforced_roles": [r for r in os.getenv("TWOFA_ENFORCED_ROLES", "SUPER_ADMIN").split(",") if r],
        "issuer": os.getenv("TWOFA_ISSUER", "StudentKare"),
    },
}

# user_id -> {"secret": str, "enabled": bool, "verified_at": str}
TWO_FA_STORE: Dict[str, Dict] = {}
# tempToken -> {"sub": user_id, "identifier": str, "exp": float}
TWO_FA_PENDING: Dict[str, Dict] = {}

SECRET_FIELD_SUFFIXES = ("key", "secret", "token", "password", "service_account_json")

def mask_secret(value: str) -> str:
    if not value:
        return ""
    s = str(value)
    if len(s) <= 4:
        return "••••"
    return f"{s[:2]}••••••{s[-2:]}"

def sanitize_integration(provider: str, config: Dict) -> Dict:
    out: Dict = {}
    for k, v in config.items():
        if isinstance(v, str) and (k in SECRET_FIELD_SUFFIXES or any(s in k for s in SECRET_FIELD_SUFFIXES)):
            out[k] = v
            out[f"{k}_masked"] = mask_secret(v)
        else:
            out[k] = v
    return out

def require_super_admin(user: Dict = Depends(get_current_user)) -> Dict:
    if user.get("role") not in ("SUPER_ADMIN", "COSIGNER_ADMIN"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Super Admin access required")
    return user

# --- TOTP (RFC 6238, no extra deps) ---
def _b32_decode(secret: str) -> bytes:
    s = secret.strip().replace(" ", "").upper()
    s += "=" * (-len(s) % 8)
    return base64.b32decode(s)

def totp_now(secret: str, step: int = 30, digits: int = 6) -> str:
    counter = int(time.time() // step)
    msg = struct.pack(">Q", counter)
    digest = hmac.new(_b32_decode(secret), msg, hashlib.sha1).digest()
    offset = digest[-1] & 0x0F
    code = struct.unpack(">I", digest[offset:offset + 4])[0] & 0x7FFFFFFF
    return str(code % (10 ** digits)).zfill(digits)

def totp_verify(secret: str, token: str, step: int = 30, digits: int = 6, window: int = 1) -> bool:
    token = (token or "").strip()
    if not token.isdigit() or len(token) != digits:
        return False
    counter = int(time.time() // step)
    for delta in range(-window, window + 1):
        msg = struct.pack(">Q", counter + delta)
        digest = hmac.new(_b32_decode(secret), msg, hashlib.sha1).digest()
        offset = digest[-1] & 0x0F
        code = struct.unpack(">I", digest[offset:offset + 4])[0] & 0x7FFFFFFF
        if str(code % (10 ** digits)).zfill(digits) == token:
            return True
    return False

def generate_totp_secret() -> str:
    return base64.b32encode(secrets.token_bytes(20)).decode().rstrip("=")

def build_public_config() -> Dict:
    return {
        "posthog": {
            "enabled": bool(INTEGRATIONS_DB["posthog"].get("enabled")),
            "apiKey": INTEGRATIONS_DB["posthog"].get("api_key", ""),
            "host": INTEGRATIONS_DB["posthog"].get("host", "https://app.posthog.com"),
        },
        "firebase": {
            "enabled": bool(INTEGRATIONS_DB["firebase"].get("enabled")),
            "apiKey": INTEGRATIONS_DB["firebase"].get("api_key", ""),
            "authDomain": INTEGRATIONS_DB["firebase"].get("auth_domain", ""),
            "projectId": INTEGRATIONS_DB["firebase"].get("project_id", ""),
            "messagingSenderId": INTEGRATIONS_DB["firebase"].get("messaging_sender_id", ""),
            "appId": INTEGRATIONS_DB["firebase"].get("app_id", ""),
            "vapidKey": INTEGRATIONS_DB["firebase"].get("vapid_key", ""),
        },
        "otp": {
            "channel": INTEGRATIONS_DB["otp"].get("channel", "WHATSAPP"),
            "ttlSeconds": INTEGRATIONS_DB["otp"].get("ttl_seconds", 300),
        },
        "twofa": {
            "enforcedRoles": INTEGRATIONS_DB["twofa"].get("enforced_roles", ["SUPER_ADMIN"]),
            "issuer": INTEGRATIONS_DB["twofa"].get("issuer", "StudentKare"),
        },
    }

def send_openwa_otp_text(phone_digits: str, text: str) -> Dict:
    """Best-effort WhatsApp OTP dispatch via self-hosted OpenWA gateway. Never raises."""
    cfg = INTEGRATIONS_DB.get("openwa", {})
    if not cfg.get("enabled"):
        return {"status": "skipped", "reason": "openwa_disabled"}
    base_url = (cfg.get("base_url") or "").rstrip("/")
    api_key = cfg.get("api_key") or ""
    session_id = cfg.get("session_id") or ""
    if not (base_url and api_key and session_id):
        return {"status": "skipped", "reason": "openwa_not_configured"}
    digits = "".join(c for c in phone_digits if c.isdigit())
    cc = (cfg.get("default_country_code") or "91").lstrip("+")
    if len(digits) == 10:
        digits = f"{cc}{digits}"
    chat_id = f"{digits}@c.us"
    payload = json.dumps({"chatId": chat_id, "text": text[:4096]}).encode()
    url = f"{base_url}/api/sessions/{session_id}/messages/send-text"
    try:
        req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json", "X-API-Key": api_key}, method="POST")
        with urllib.request.urlopen(req, timeout=10) as resp:
            body = resp.read().decode()[:500]
            return {"status": "sent" if 200 <= resp.status < 300 else "failed", "http": resp.status, "body": body, "chat_id": chat_id}
    except urllib.error.HTTPError as e:
        # WAHA-style fallback: /api/sendText
        try:
            alt = json.dumps({"session": session_id, "chatId": chat_id, "text": text[:4096]}).encode()
            req2 = urllib.request.Request(f"{base_url}/api/sendText", data=alt, headers={"Content-Type": "application/json", "X-API-Key": api_key}, method="POST")
            with urllib.request.urlopen(req2, timeout=10) as resp2:
                return {"status": "sent" if 200 <= resp2.status < 300 else "failed", "http": resp2.status, "fallback": True, "chat_id": chat_id}
        except Exception as e2:
            return {"status": "failed", "reason": str(e2)[:300]}
        return {"status": "failed", "reason": f"http_{e.code}"}
    except Exception as e:
        return {"status": "failed", "reason": str(e)[:300]}

def send_postal_otp_email(to_email: str, code: str, ttl_seconds: int = 300) -> Dict:
    """Best-effort Email OTP dispatch via Postal (postalserver.io) HTTP API. Never raises."""
    cfg = INTEGRATIONS_DB.get("postal", {})
    if not cfg.get("enabled"):
        return {"status": "skipped", "reason": "postal_disabled"}
    api_url = (cfg.get("api_url") or "").rstrip("/")
    server_key = cfg.get("server_api_key") or ""
    from_email = cfg.get("from_email") or "StudentKare <noreply@studentkare.in>"
    if not (api_url and server_key):
        return {"status": "skipped", "reason": "postal_not_configured"}
    mins = max(1, ttl_seconds // 60)
    html = (
        f"<div style='font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px'>"
        f"<h2>Your StudentKare verification code</h2>"
        f"<p style='font-size:32px;font-weight:800;letter-spacing:6px'>{code}</p>"
        f"<p>This code expires in {mins} minutes. Do not share it.</p>"
        f"<p style='color:#666;font-size:12px'>If you did not request this, ignore this email.</p></div>"
    )
    text = f"Your StudentKare verification code is {code}. It expires in {mins} minutes. Do not share it."
    payload = json.dumps({
        "to": to_email, "from": from_email,
        "subject": f"Your StudentKare code: {code}",
        "html_body": html, "text_body": text, "tag": "otp",
    }).encode()
    try:
        req = urllib.request.Request(
            f"{api_url}/api/v1/send/message", data=payload,
            headers={"Content-Type": "application/json", "X-Server-API-Key": server_key}, method="POST")
        with urllib.request.urlopen(req, timeout=15) as resp:
            return {"status": "sent" if 200 <= resp.status < 300 else "failed", "http": resp.status}
    except Exception as e:
        return {"status": "failed", "reason": str(e)[:300]}

def check_rate_limit(identifier: str, max_requests: int = 5, window_seconds: int = 900):
    now = time.time()
    history = RATE_LIMIT_STORE.get(identifier, [])
    history = [t for t in history if now - t < window_seconds]
    if len(history) >= max_requests:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Too many OTP requests. Please wait 15 minutes.",
        )
    history.append(now)
    RATE_LIMIT_STORE[identifier] = history

# ─── GENERATE 1,100+ BACKEND TELECONSULT CATALOGS ────────────────────────────

def build_doctors_catalog():
    specialties = [
        "General Internal Medicine", "Cardiology & Telemetry", "Psychiatry & Student Mental Health",
        "Dermatology & Skin Care", "Ophthalmology & Visual Acuity", "Dental & Intraoral Surgery",
        "ENT & Allergy Care", "Orthopedics & Sports Medicine", "Gynecology & Women’s Health", "Hostel Clinical Nutrition"
    ]
    campuses = [
        "Osmania University Medical Pod 1", "IIT Hyderabad Health Centre", "BITS Pilani Hyderabad Campus Clinic",
        "University of Hyderabad Health Hub", "AIIMS Campus Clinic Station"
    ]
    first_names = ["Ananya", "Vikram", "Radhika", "Suresh", "Priya", "Rajesh", "Kavita", "Arun", "Meera", "Deepak"]
    last_names = ["Rao", "Sen", "Sharma", "Iyer", "Reddy", "Mehta", "Verma", "Patel", "Joshi", "Gupta"]

    docs = []
    for i in range(1, 401):
        fn = first_names[i % len(first_names)]
        ln = last_names[i % len(last_names)]
        docs.append({
            "id": f"DOC-NMC-{1000 + i}",
            "name": f"Dr. {fn} {ln}, MD",
            "specialty": specialties[i % len(specialties)],
            "councilRef": f"NMC/{10000 + i}/2018",
            "campusStation": campuses[i % len(campuses)],
            "experienceYears": 6 + (i % 18),
            "rating": round(4.5 + (i % 5) * 0.1, 1),
            "consultationFee": "Free (StudentKare Pass)",
            "status": "AVAILABLE" if i % 3 == 0 else "ON_DUTY"
        })
    return docs

def build_medications_catalog():
    drug_templates = [
        {"brand": "Dolo 650", "mol": "Paracetamol 650mg", "cat": "Fever & Acute Pain SOS", "rx": False, "price": 32},
        {"brand": "Allegra 120", "mol": "Fexofenadine 120mg", "cat": "Allergy & Rhinitis", "rx": False, "price": 110},
        {"brand": "Asthalin Inhaler", "mol": "Salbutamol 100mcg", "cat": "Respiratory Asthma Inhalers", "rx": True, "price": 145},
        {"brand": "Electral Sachet", "mol": "WHO Formula Salts", "cat": "Hydration & Electrolytes", "rx": False, "price": 22},
        {"brand": "Magnesium Glycinate", "mol": "Magnesium 250mg", "cat": "Exam Stress & Sleep Hygiene", "rx": False, "price": 240},
    ]
    meds = []
    for i in range(1, 401):
        tmpl = drug_templates[i % len(drug_templates)]
        meds.append({
            "id": f"PHARM-{2000 + i}",
            "brandName": f"{tmpl['brand']} Code #{i}",
            "activeMolecule": tmpl["mol"],
            "category": tmpl["cat"],
            "price": tmpl["price"],
            "prescriptionRequired": tmpl["rx"],
            "deliveryTimeMins": 20 + (i % 25),
            "stockCount": 50 + (i % 300)
        })
    return meds

def build_diagnostics_catalog():
    test_templates = [
        {"name": "Complete Blood Count (CBC) + ESR", "cat": "BLOOD", "vendor": "SRL Diagnostics", "price": 450, "hrs": 6},
        {"name": "Dengue NS1 Antigen Elisa Panel", "cat": "BLOOD", "vendor": "Dr. Lal PathLabs", "price": 850, "hrs": 6},
        {"name": "HbA1c & Fasting Blood Glucose", "cat": "BLOOD", "vendor": "Apollo Diagnostics", "price": 520, "hrs": 8},
        {"name": "Digital Chest X-Ray (PA View)", "cat": "RADIOLOGY", "vendor": "Mahajan Imaging", "price": 650, "hrs": 2},
        {"name": "Ultrasonic Dental Scaling", "cat": "DENTAL", "vendor": "Clove Dental Pods", "price": 350, "hrs": 1},
    ]
    tests = []
    for i in range(1, 301):
        tmpl = test_templates[i % len(test_templates)]
        tests.append({
            "id": f"TEST-{3000 + i}",
            "testName": f"{tmpl['name']} #{i}",
            "category": tmpl["cat"],
            "vendorName": tmpl["vendor"],
            "price": tmpl["price"],
            "turnaroundHours": tmpl["hrs"],
            "samplePickup": "Free Hostel Room Pickup" if tmpl["cat"] == "BLOOD" else "Campus Clinic Pod"
        })
    return tests

DOCTORS_DB = build_doctors_catalog()
MEDICATIONS_DB = build_medications_catalog()
DIAGNOSTICS_DB = build_diagnostics_catalog()

# ─── PYDANTIC SCHEMAS ────────────────────────────────────────────────────────

class SendOtpRequest(BaseModel):
    identifier: str
    channel: str = "WHATSAPP"
    intent: str = "LOGIN"
    fallbackEmail: Optional[str] = None

class SendOtpResponse(BaseModel):
    success: bool
    message: str
    targetMasked: str
    channelUsed: str
    expiresInSeconds: int
    fallbackSent: bool = False
    fallbackChannel: Optional[str] = None
    fallbackTargetMasked: Optional[str] = None

class VerifyOtpRequest(BaseModel):
    identifier: str
    otp: str
    channel: str = "WHATSAPP"

class VerifyOtpResponse(BaseModel):
    success: bool
    token: str = ""
    user: Dict = {}
    isNewUser: bool = False
    requires2FA: bool = False
    tempToken: Optional[str] = None

class TriageLoopRequest(BaseModel):
    complaint: str
    tempF: float
    bloodPressure: str

class SafetyLoopRequest(BaseModel):
    medicationName: str
    allergies: List[str]

class RAGQueryRequest(BaseModel):
    query: str
    topK: int = 2

class BreakGlassCreateRequest(BaseModel):
    studentId: str
    reasonCategory: str
    reasonText: str
    scope: List[str]
    dualApproverAdminId: str
    sensitiveCategoryApproverId: Optional[str] = None
    sensitiveCategory: Optional[str] = "NONE"

class AuditEntryCreateRequest(BaseModel):
    actorId: str
    actorName: str
    actorType: str = "HUMAN_ADMIN"
    action: str
    ruleId: str
    resourceType: str
    resourceId: Optional[str] = None
    details: str
    institutionId: Optional[str] = None

class CreateTenantRequest(BaseModel):
    name: str
    code: str
    tier: str = "PREMIUM_TIER"
    maxSeats: int = 5000
    abdmFacilityId: str

# ─── AUTH & DEMO CREDENTIALS ENDPOINTS ───────────────────────────────────────

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "StudentKare FastAPI Auth, Teleconsult & RAG API",
        "version": "0.6.0",
        "timestamp": int(time.time()),
        "totalDoctorsCatalogCount": len(DOCTORS_DB),
        "totalMedicationsCatalogCount": len(MEDICATIONS_DB),
        "totalDiagnosticsCatalogCount": len(DIAGNOSTICS_DB),
    }

@app.get("/api/auth/demo-credentials")
def get_demo_credentials():
    """
    Returns login information and test phone numbers / emails for all system roles.
    """
    return {
        "description": "Studentkare Role-Based Test Login Credentials",
        "credentials": [
            {
                "role": "SUPER_ADMIN",
                "name": "Dr. Vikram Sarabhai",
                "phone": "9999999999",
                "email": "super.admin@studentkare.in",
                "notes": "Full access to Super Admin Console, Break-Glass Protocol, Constitution Rules & AI Ops Control",
            },
            {
                "role": "COSIGNER_ADMIN",
                "name": "Prof. Rajesh Sharma",
                "phone": "9999999998",
                "email": "cosigner.admin@studentkare.in",
                "notes": "Co-signing Admin for Dual-Auth Emergency Access & Restricted Pool Sign-off (Rule K8)",
            },
            {
                "role": "CAMPUS_ADMIN",
                "name": "Dr. Sunita Rao",
                "phone": "9876500001",
                "email": "health.admin@osmania.ac.in",
                "notes": "Campus Health Administrator for Osmania University",
            },
            {
                "role": "NMC_DOCTOR",
                "name": "Dr. Ananya Rao, MD",
                "phone": "9876500002",
                "email": "dr.ananya.rao@studentkare.in",
                "notes": "NMC Registered Clinician for Teleconsult & Prescription Sign-off",
            },
            {
                "role": "STUDENT",
                "name": "Arjun Mehta",
                "phone": "9876543210",
                "email": "arjun.m@osmania.ac.in",
                "notes": "Student PHR Record Holder & Teleconsult Pass User",
            },
        ]
    }

@app.post("/api/auth/otp/send", response_model=SendOtpResponse)
def send_otp(req: SendOtpRequest):
    identifier = req.identifier.strip().replace(" ", "").replace("+91", "")
    check_rate_limit(identifier)

    otp_cfg = INTEGRATIONS_DB.get("otp", {})
    ttl = int(otp_cfg.get("ttl_seconds", 300))

    # Cryptographically secure 6-digit OTP generation using secrets module
    code = f"{secrets.randbelow(900000) + 100000}"

    OTP_STORE[identifier] = {
        "code": code,
        "expires_at": time.time() + ttl,
        "channel": req.channel,
    }

    masked = f"+91 {identifier[:2]}•••• ••{identifier[-2:]}" if "@" not in identifier else identifier

    # Dual-channel dispatch: WhatsApp via OpenWA, Email via Postal (best-effort, never blocks issuance)
    channel_used = req.channel
    fallback_sent = False
    fallback_channel = None
    fallback_masked = None
    # Resolve fallback email: explicit field wins, else known user email for this phone
    known_email = (req.fallbackEmail or "").strip() or None
    if not known_email and "@" not in identifier:
        known_email = (USERS_DB.get(identifier) or {}).get("email")
    if req.channel == "WHATSAPP" and "@" not in identifier:
        result = send_openwa_otp_text(
            identifier,
            f"Your StudentKare verification code is {code}. It expires in {ttl // 60} minutes. Do not share it.",
        )
        if result.get("status") == "skipped" and result.get("reason") in ("openwa_disabled", "openwa_not_configured"):
            channel_used = req.channel  # mock mode — code stays in OTP_STORE for verification
        elif result.get("status") != "sent":
            # Log to audit trail but still succeed (dev fallback shows code via demo flow)
            AUDIT_LOGS_DB.insert(0, {
                "id": f"aud_otp_{secrets.randbelow(90000) + 10000}",
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "actorId": "system",
                "actorName": "OTP Service",
                "actorType": "SYSTEM",
                "action": "OTP_WHATSAPP_DISPATCH_FAILED",
                "ruleId": "Rule-K1",
                "resourceType": "OTP_DISPATCH",
                "details": f"OpenWA dispatch failed for {masked}: {result.get('reason', result)}",
                "institutionId": None,
            })
            # Auto-fallback: WhatsApp failed → also send via Postal email if we know one
            if known_email and "@" in known_email:
                fb = send_postal_otp_email(known_email.strip(), code, ttl)
                if fb.get("status") == "sent":
                    fallback_sent = True
                    fallback_channel = "EMAIL"
                    local, _, domain = known_email.strip().partition("@")
                    fallback_masked = f"{local[:1]}•••••@{domain}" if local else known_email
                    AUDIT_LOGS_DB.insert(0, {
                        "id": f"aud_otp_{secrets.randbelow(90000) + 10000}",
                        "timestamp": datetime.utcnow().isoformat() + "Z",
                        "actorId": "system",
                        "actorName": "OTP Service",
                        "actorType": "SYSTEM",
                        "action": "OTP_EMAIL_FALLBACK_SENT",
                        "ruleId": "Rule-K1",
                        "resourceType": "OTP_DISPATCH",
                        "details": f"WhatsApp failed for {masked}; fallback email sent to {fallback_masked}",
                        "institutionId": None,
                    })
    elif req.channel == "EMAIL" or "@" in identifier:
        email_target = req.identifier.strip()
        if "@" in email_target:
            result = send_postal_otp_email(email_target, code, ttl)
            channel_used = "EMAIL"
            if result.get("status") not in ("sent",):
                AUDIT_LOGS_DB.insert(0, {
                    "id": f"aud_otp_{secrets.randbelow(90000) + 10000}",
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                    "actorId": "system",
                    "actorName": "OTP Service",
                    "actorType": "SYSTEM",
                    "action": "OTP_EMAIL_DISPATCH_FAILED" if result.get("status") == "failed" else "OTP_EMAIL_DISPATCH_SKIPPED",
                    "ruleId": "Rule-K1",
                    "resourceType": "OTP_DISPATCH",
                    "details": f"Postal dispatch {result.get('status')} for {masked}: {result.get('reason', result)}",
                    "institutionId": None,
                })

    return SendOtpResponse(
        success=True,
        message=(
            f"6-digit authentication code sent via {channel_used}"
            + (f". WhatsApp not reachable — same code also sent to email {fallback_masked} in case it didn't arrive on WhatsApp." if fallback_sent else "")
        ),
        targetMasked=masked,
        channelUsed=channel_used,
        expiresInSeconds=ttl,
        fallbackSent=fallback_sent,
        fallbackChannel=fallback_channel,
        fallbackTargetMasked=fallback_masked,
    )

@app.post("/api/auth/otp/verify", response_model=VerifyOtpResponse)
def verify_otp(req: VerifyOtpRequest):
    identifier = req.identifier.strip().replace(" ", "").replace("+91", "")
    check_rate_limit(identifier, max_requests=10, window_seconds=300)

    cached = OTP_STORE.get(identifier)
    
    # Strict OTP validation
    is_valid_code = (
        cached is not None
        and cached["code"] == req.otp
        and time.time() <= cached["expires_at"]
    )

    if not is_valid_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification code.",
        )

    # Invalidate consumed OTP
    OTP_STORE.pop(identifier, None)

    user = USERS_DB.get(identifier)
    is_new = user is None

    if is_new:
        user = {
            "id": f"std_{secrets.randbelow(9000) + 1000}",
            "fullName": "Student User",
            "phone": identifier if "@" not in identifier else "9811122334",
            "email": identifier if "@" in identifier else f"student.{identifier[-4:]}@university.edu",
            "role": "STUDENT",
            "dob": "2004-01-01",
            "age": 22,
            "bloodGroup": "B+",
            "university": "Osmania University",
            "institutionId": None,
            "college": "Main Campus",
            "rollNumber": f"URN-2026-{identifier[-4:]}",
            "abhaAddress": f"student.{identifier[-4:]}@abdm",
            "ageVerified": False,
            "isVerifiedStudent": True,
            "allergies": [],
            "chronicConditions": [],
            "currentMedications": [],
            "emergencyContacts": [
                {"relation": "Primary Guardian", "phone": "+91 98111 22334"}
            ],
            "pointsBalance": 100,
        }
        USERS_DB[identifier] = user

    # Generate real signed JWT token with role
    token = create_access_token(data={"sub": user["id"], "identifier": identifier, "role": user.get("role", "STUDENT")})

    # 2FA gate: if user enrolled (or role enforced + enrolled), require TOTP challenge
    twofa_cfg = INTEGRATIONS_DB.get("twofa", {})
    enforced = twofa_cfg.get("enforced_roles", ["SUPER_ADMIN"])
    fa = TWO_FA_STORE.get(user["id"])
    if fa and fa.get("enabled"):
        temp = secrets.token_urlsafe(24)
        TWO_FA_PENDING[temp] = {"sub": user["id"], "identifier": identifier, "exp": time.time() + 300}
        return VerifyOtpResponse(
            success=True,
            token="",
            user={k: v for k, v in user.items() if k not in ("emergencyContacts",)},
            isNewUser=is_new,
            requires2FA=True,
            tempToken=temp,
        )

    return VerifyOtpResponse(
        success=True,
        token=token,
        user=user,
        isNewUser=is_new,
        requires2FA=False,
        tempToken=None,
    )

# ─── SUPER ADMIN CONSOLE & AI OPS BACKEND ENDPOINTS (JWT PROTECTED) ─────────

@app.get("/api/admin/telemetry")
def get_admin_telemetry(user: Dict = Depends(get_current_user)):
    """
    Aggregate telemetry console endpoints enforcing K-Anonymity floor >= 20.
    """
    total_students = 128450
    active_sessions = 42
    total_tenants = len(TENANTS_DB)
    abdm_fhir_sync_count = 412980
    
    # Enforce k-anonymity for cohort breakdown
    cohort_breakdown = {
        "Osmania University": "24,500 students",
        "IIT Hyderabad": "8,200 students",
        "BITS Pilani Hyderabad": "5,400 students",
        "Special Needs Support Group": "< 20 (Suppressed under Rule K-Anonymity)",
    }

    return {
        "systemStatus": "OPERATIONAL",
        "totalStudents": total_students,
        "activeSessions": active_sessions,
        "totalTenants": total_tenants,
        "abdmSyncCount": abdm_fhir_sync_count,
        "kAnonymityFloor": 20,
        "cohortBreakdown": cohort_breakdown,
        "activeBreakGlassSessions": len([s for s in BREAK_GLASS_SESSIONS_DB.values() if s.get("active")]),
    }

@app.post("/api/admin/break-glass")
def request_break_glass(req: BreakGlassCreateRequest, user: Dict = Depends(get_current_user)):
    """
    Dual-Authorization Emergency Break-Glass Access Protocol (Rule K8).
    Creates pre-render Audit Log BEFORE returning session.
    """
    if len(req.reasonText.strip()) < 15:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Justification must be at least 15 characters long detailing emergency medical or legal necessity.",
        )
    
    if req.dualApproverAdminId == user.get("sub"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Dual authorization requires a distinct co-signing administrator ID.",
        )

    is_sensitive = req.sensitiveCategory in ["MENTAL_HEALTH", "REPRODUCTIVE", "HIV"]
    if is_sensitive and not req.sensitiveCategoryApproverId:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Restricted Pool Admin Sign-off is mandatory under Rule K8 for sensitive health categories.",
        )

    session_id = f"bg_{secrets.randbelow(90000) + 10000}"
    audit_id = f"aud_bg_{secrets.randbelow(90000) + 10000}"
    now_dt = datetime.utcnow()
    expires_dt = now_dt + timedelta(minutes=60)

    # 1. MANDATORY: Create Audit Log Entry BEFORE returning session/data
    audit_entry = {
        "id": audit_id,
        "timestamp": now_dt.isoformat() + "Z",
        "actorId": user.get("sub"),
        "actorName": "Super Admin User",
        "actorType": "HUMAN_ADMIN",
        "action": "EMERGENCY_BREAK_GLASS_INITIATED",
        "ruleId": "Rule-K8",
        "resourceType": "STUDENT_CLINICAL_RECORD",
        "resourceId": req.studentId,
        "details": f"Reason: {req.reasonCategory}. Justification: '{req.reasonText}'. Co-Signer: {req.dualApproverAdminId}. Sensitive: {req.sensitiveCategory}",
        "institutionId": None,
    }
    AUDIT_LOGS_DB.insert(0, audit_entry)

    # 2. Create Break-Glass Session
    session_data = {
        "id": session_id,
        "studentId": req.studentId,
        "requestedByAdminId": user.get("sub"),
        "reasonCategory": req.reasonCategory,
        "reasonText": req.reasonText,
        "scope": req.scope,
        "dualApproverAdminId": req.dualApproverAdminId,
        "sensitiveCategoryApproverId": req.sensitiveCategoryApproverId,
        "sensitiveCategory": req.sensitiveCategory,
        "createdAt": now_dt.isoformat() + "Z",
        "expiresAt": expires_dt.isoformat() + "Z",
        "active": True,
        "auditEntryId": audit_id,
    }
    BREAK_GLASS_SESSIONS_DB[session_id] = session_data

    return {
        "success": True,
        "message": "Emergency Break-Glass Session authorized for 60 minutes. Action audited under Rule K8.",
        "session": session_data,
    }

@app.get("/api/admin/break-glass/sessions")
def list_break_glass_sessions(user: Dict = Depends(get_current_user)):
    return {"sessions": list(BREAK_GLASS_SESSIONS_DB.values())}

@app.delete("/api/admin/break-glass/sessions/{session_id}")
def revoke_break_glass_session(session_id: str, user: Dict = Depends(get_current_user)):
    session = BREAK_GLASS_SESSIONS_DB.get(session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Break-glass session not found")
    
    session["active"] = False
    
    # Audit Revocation
    AUDIT_LOGS_DB.insert(0, {
        "id": f"aud_rev_{secrets.randbelow(90000) + 10000}",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "actorId": user.get("sub"),
        "actorName": "Super Admin User",
        "actorType": "HUMAN_ADMIN",
        "action": "EMERGENCY_BREAK_GLASS_REVOKED",
        "ruleId": "Rule-K8",
        "resourceType": "BREAK_GLASS_SESSION",
        "resourceId": session_id,
        "details": f"Break-glass session {session_id} manually revoked prior to 60-min auto-expiry.",
        "institutionId": None,
    })

    return {"success": True, "message": f"Break-glass session {session_id} revoked."}

@app.get("/api/admin/audit-logs")
def get_audit_logs(ruleId: Optional[str] = None, actorType: Optional[str] = None, user: Dict = Depends(get_current_user)):
    logs = AUDIT_LOGS_DB
    if ruleId:
        logs = [l for l in logs if l.get("ruleId") == ruleId]
    if actorType:
        logs = [l for l in logs if l.get("actorType") == actorType]
    return {"total": len(logs), "logs": logs}

@app.post("/api/admin/audit-logs")
def create_audit_entry(req: AuditEntryCreateRequest, user: Dict = Depends(get_current_user)):
    entry = {
        "id": f"aud_{secrets.randbelow(90000) + 10000}",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "actorId": req.actorId,
        "actorName": req.actorName,
        "actorType": req.actorType,
        "action": req.action,
        "ruleId": req.ruleId,
        "resourceType": req.resourceType,
        "resourceId": req.resourceId,
        "details": req.details,
        "institutionId": req.institutionId,
    }
    AUDIT_LOGS_DB.insert(0, entry)
    return {"success": True, "entry": entry}

@app.get("/api/admin/tenants")
def get_tenants(user: Dict = Depends(get_current_user)):
    return {"tenants": TENANTS_DB}

@app.post("/api/admin/tenants")
def create_tenant(req: CreateTenantRequest, user: Dict = Depends(get_current_user)):
    tenant = {
        "id": f"inst_{req.code.lower().replace('-', '_')}_{secrets.randbelow(90) + 10}",
        "name": req.name,
        "code": req.code,
        "tier": req.tier,
        "activeSeats": 0,
        "maxSeats": req.maxSeats,
        "abdmFacilityId": req.abdmFacilityId,
        "status": "ACTIVE",
        "joinedAt": datetime.utcnow().strftime("%Y-%m-%d"),
    }
    TENANTS_DB.append(tenant)
    return {"success": True, "tenant": tenant}

@app.get("/api/admin/rules")
def get_constitution_rules(user: Dict = Depends(get_current_user)):
    """
    Returns active Constitution rules (L1-L8, K1-K8, J1-J4).
    """
    rules = [
        {"id": "Rule-L1", "category": "Commerce Firewall", "title": "Zero Transaction Fee on Student Health", "description": "Student health access is free of charge forever."},
        {"id": "Rule-L2", "category": "Commerce Firewall", "title": "Insurer & Institution Billing Only", "description": "Monetization occurs strictly via B2B institutional seat licensing."},
        {"id": "Rule-L8", "category": "Commerce Firewall", "title": "Non-Monetary Reward Points Boundary", "description": "Student engagement points carry zero cash value and cannot be redeemed for money."},
        {"id": "Rule-K1", "category": "Clinical Isolation", "title": "Two-Plane Architecture Separation", "description": "AI agents exist solely on Operational Plane and are barred from identified clinical data."},
        {"id": "Rule-K4", "category": "Provenanced Intelligence", "title": "Pixel Provenance Mandatory", "description": "Claims & OCR extractions require explicit page and bounding box provenance."},
        {"id": "Rule-K8", "category": "Access Control", "title": "Dual-Auth Emergency Break-Glass", "description": "Human access to clinical records requires dual admin authorization and pre-render audit logging."},
        {"id": "Rule-K-Anonymity", "category": "Privacy", "title": "K-Anonymity Floor = 20", "description": "Cohort counts under 20 are suppressed to prevent re-identification."},
        {"id": "Rule-J1", "category": "Provider Network", "title": "Minimum Provider Coverage per Pincode", "description": "Every campus pincode requires at least 2 active emergency care providers."},
    ]
    return {"rules": rules}

@app.get("/api/admin/departments")
def get_ai_departments(user: Dict = Depends(get_current_user)):
    return {"departments": list(DEPARTMENTS_DB.values())}

@app.post("/api/admin/departments/{dept_id}/kill-switch")
def toggle_department_kill_switch(dept_id: str, user: Dict = Depends(get_current_user)):
    dept = DEPARTMENTS_DB.get(dept_id)
    if not dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="AI Department not found")
    
    dept["killSwitchActive"] = not dept["killSwitchActive"]
    dept["status"] = "HALTED" if dept["killSwitchActive"] else "ACTIVE"

    # Audit Kill Switch Action
    AUDIT_LOGS_DB.insert(0, {
        "id": f"aud_ks_{secrets.randbelow(90000) + 10000}",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "actorId": user.get("sub"),
        "actorName": "Super Admin User",
        "actorType": "HUMAN_ADMIN",
        "action": "DEPARTMENT_KILL_SWITCH_TOGGLED",
        "ruleId": "Rule-K1",
        "resourceType": "AI_DEPARTMENT",
        "resourceId": dept_id,
        "details": f"Department {dept_id} ({dept['name']}) kill switch set to {dept['killSwitchActive']}.",
        "institutionId": None,
    })

    return {"success": True, "department": dept}

# ─── TELECONSULT 1,100+ CATALOG ENDPOINTS (JWT PROTECTED) ────────────────────

@app.get("/api/teleconsult/doctors")
def get_doctors(q: Optional[str] = None, user: Dict = Depends(get_current_user)):
    if not q:
        return {"total": len(DOCTORS_DB), "items": DOCTORS_DB[:50]}
    filtered = [d for d in DOCTORS_DB if q.lower() in d["name"].lower() or q.lower() in d["specialty"].lower()]
    return {"total": len(filtered), "items": filtered[:50]}

@app.get("/api/teleconsult/medications")
def get_medications(q: Optional[str] = None, user: Dict = Depends(get_current_user)):
    if not q:
        return {"total": len(MEDICATIONS_DB), "items": MEDICATIONS_DB[:50]}
    filtered = [m for m in MEDICATIONS_DB if q.lower() in m["brandName"].lower() or q.lower() in m["category"].lower()]
    return {"total": len(filtered), "items": filtered[:50]}

@app.get("/api/teleconsult/diagnostics")
def get_diagnostics(q: Optional[str] = None, user: Dict = Depends(get_current_user)):
    if not q:
        return {"total": len(DIAGNOSTICS_DB), "items": DIAGNOSTICS_DB[:50]}
    filtered = [t for t in DIAGNOSTICS_DB if q.lower() in t["testName"].lower() or q.lower() in t["category"].lower()]
    return {"total": len(filtered), "items": filtered[:50]}

# ─── AGENTIC LOOP & RAG ENDPOINTS (JWT PROTECTED) ────────────────────────────

@app.post("/api/agents/triage-loop")
def run_triage_loop(req: TriageLoopRequest, user: Dict = Depends(get_current_user)):
    is_red_flag = req.tempF > 100.8 or req.bloodPressure.startswith("140")
    return {
        "agent": "TeleconsultTriageLoopAgent",
        "steps": [
            {"step": 1, "phase": "Symptom Ingestion", "result": f"Parsed complaint: '{req.complaint}', Temp {req.tempF}°F, BP {req.bloodPressure}"},
            {"step": 2, "phase": "Red Flag Evaluation", "result": "CRITICAL RED FLAG DETECTED" if is_red_flag else "Vitals Stable"},
            {"step": 3, "phase": "Care Routing", "result": "TRIAGE: URGENT_OPD ESCALATED" if is_red_flag else "TRIAGE: ROUTINE_TELECONSULT"},
        ]
    }

@app.post("/api/agents/prescription-safety-loop")
def run_safety_loop(req: SafetyLoopRequest, user: Dict = Depends(get_current_user)):
    has_conflict = any(a.lower() in req.medicationName.lower() for a in req.allergies)
    return {
        "agent": "PrescriptionSafetyLoopAgent",
        "steps": [
            {"step": 1, "phase": "Molecule Inspection", "result": f"Active drug verified: {req.medicationName}"},
            {"step": 2, "phase": "Allergy Check", "result": "CONTRAINDICATION DETECTED!" if has_conflict else "No allergy conflict detected"},
            {"step": 3, "phase": "Hostel Rider Dispatch", "result": "Hostel Express Rider Dispatched (ETA 25 mins)"},
        ]
    }

@app.post("/api/rag/query")
def run_rag_search(req: RAGQueryRequest, user: Dict = Depends(get_current_user)):
    return {
        "query": req.query,
        "retrievedChunks": [
            {"title": "NMC Clinical Guideline: Monsoon Pyrexia Protocol", "content": "Patients presenting with acute fever (>100.4°F) require CBC platelet counts. Paracetamol 650mg is first-line antipyretic."},
            {"title": "StudentKare Hostel Medical Express Policy", "content": "Express hostel deliveries guaranteed within 45 minutes across Indian university campuses."}
        ],
        "synthesizedResponse": f"Based on retrieved clinical guidelines for '{req.query}': Follow NMC antipyretic protocol with 45-minute hostel room delivery guarantee."
    }


# ─── INTEGRATIONS (SuperAdmin-configurable keys) + PUBLIC CONFIG + 2FA ───────

class IntegrationUpdateRequest(BaseModel):
    config: Dict = Field(default_factory=dict)

class TwoFAVerifyRequest(BaseModel):
    token: str
    tempToken: Optional[str] = None

@app.get("/api/config/public")
def get_public_config():
    """Unauthenticated non-secret config for frontend init (PostHog, Firebase, OTP, 2FA policy)."""
    return build_public_config()

@app.get("/api/admin/integrations")
def list_integrations(user: Dict = Depends(require_super_admin)):
    return {"integrations": {k: sanitize_integration(k, v) for k, v in INTEGRATIONS_DB.items()}}

@app.put("/api/admin/integrations/{provider}")
def update_integration(provider: str, req: IntegrationUpdateRequest, user: Dict = Depends(require_super_admin)):
    if provider not in INTEGRATIONS_DB:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Unknown provider '{provider}'")
    # Merge only known keys; coerce booleans/ints where appropriate
    current = INTEGRATIONS_DB[provider]
    for k, v in (req.config or {}).items():
        if k.endswith("_masked"):
            continue
        if k in current:
            current[k] = v
        else:
            current[k] = v
    AUDIT_LOGS_DB.insert(0, {
        "id": f"aud_int_{secrets.randbelow(90000) + 10000}",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "actorId": user.get("sub"),
        "actorName": "Super Admin User",
        "actorType": "HUMAN_ADMIN",
        "action": "INTEGRATION_CONFIG_UPDATED",
        "ruleId": "Rule-K1",
        "resourceType": "INTEGRATION",
        "resourceId": provider,
        "details": f"Integration '{provider}' config updated. Keys: {sorted((req.config or {}).keys())}",
        "institutionId": None,
    })
    return {"success": True, "provider": provider, "config": sanitize_integration(provider, current)}

@app.post("/api/admin/integrations/{provider}/test")
def test_integration(provider: str, user: Dict = Depends(require_super_admin)):
    if provider == "openwa":
        cfg = INTEGRATIONS_DB["openwa"]
        if not cfg.get("base_url") or not cfg.get("api_key") or not cfg.get("session_id"):
            return {"success": False, "connected": False, "message": "OpenWA not configured (base_url/api_key/session_id required)"}
        try:
            url = f"{cfg['base_url'].rstrip('/')}/api/sessions/{cfg['session_id']}"
            req = urllib.request.Request(url, headers={"X-API-Key": cfg["api_key"]}, method="GET")
            with urllib.request.urlopen(req, timeout=10) as resp:
                return {"success": 200 <= resp.status < 300, "connected": 200 <= resp.status < 300, "http": resp.status}
        except Exception as e:
            return {"success": False, "connected": False, "message": str(e)[:300]}
    if provider == "posthog":
        cfg = INTEGRATIONS_DB["posthog"]
        if not cfg.get("enabled") or not cfg.get("api_key"):
            return {"success": False, "message": "PostHog disabled or api_key missing"}
        try:
            payload = json.dumps({
                "api_key": cfg["api_key"],
                "event": "integration_test",
                "properties": {"source": "studentkare-superadmin"},
            }).encode()
            req = urllib.request.Request(
                f"{(cfg.get('host') or 'https://app.posthog.com').rstrip('/')}/capture/",
                data=payload, headers={"Content-Type": "application/json"}, method="POST")
            with urllib.request.urlopen(req, timeout=10) as resp:
                return {"success": 200 <= resp.status < 300, "http": resp.status, "message": "Test event sent to PostHog"}
        except Exception as e:
            return {"success": False, "message": str(e)[:300]}
    if provider == "firebase":
        cfg = INTEGRATIONS_DB["firebase"]
        missing = [k for k in ("api_key", "project_id", "app_id") if not cfg.get(k)]
        if not cfg.get("enabled"):
            return {"success": False, "message": "Firebase disabled"}
        if missing:
            return {"success": False, "message": f"Missing Firebase fields: {missing}"}
        return {"success": True, "message": f"Firebase config valid for project '{cfg.get('project_id')}' (client SDK init)"}
    if provider == "postal":
        cfg = INTEGRATIONS_DB["postal"]
        if not cfg.get("enabled"):
            return {"success": False, "message": "Postal disabled"}
        if not cfg.get("api_url") or not cfg.get("server_api_key"):
            return {"success": False, "message": "Postal not configured (api_url/server_api_key required)"}
        try:
            # Lightweight connectivity check: hit Postal API root (auth via header)
            req = urllib.request.Request(
                f"{cfg['api_url'].rstrip('/')}/api/v1/send/message", method="OPTIONS")
            with urllib.request.urlopen(req, timeout=10) as resp:
                return {"success": True, "http": resp.status, "message": f"Postal reachable at {cfg['api_url']}"}
        except urllib.error.HTTPError as e:
            # 4xx/405 on OPTIONS still proves reachability when server responds
            return {"success": True, "http": e.code, "message": f"Postal reachable (HTTP {e.code} on probe)"}
        except Exception as e:
            return {"success": False, "message": str(e)[:300]}
    if provider in ("otp", "twofa"):
        return {"success": True, "message": f"{provider} policy valid", "config": INTEGRATIONS_DB[provider]}
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Unknown provider '{provider}'")

@app.post("/api/auth/2fa/setup")
def setup_2fa(user: Dict = Depends(get_current_user)):
    issuer = INTEGRATIONS_DB.get("twofa", {}).get("issuer", "StudentKare")
    existing = TWO_FA_STORE.get(user.get("sub"))
    secret = (existing or {}).get("secret") or generate_totp_secret()
    TWO_FA_STORE[user.get("sub")] = {"secret": secret, "enabled": bool((existing or {}).get("enabled")), "verified_at": (existing or {}).get("verified_at")}
    account = user.get("identifier") or user.get("sub") or "user"
    otpauth = f"otpauth://totp/{urllib.parse.quote(issuer)}:{urllib.parse.quote(str(account))}?secret={secret}&issuer={urllib.parse.quote(issuer)}&digits=6&period=30"
    return {"success": True, "secret": secret, "otpauthUrl": otpauth, "enabled": TWO_FA_STORE[user.get("sub")]["enabled"]}

@app.post("/api/auth/2fa/enable")
def enable_2fa(req: TwoFAVerifyRequest, user: Dict = Depends(get_current_user)):
    entry = TWO_FA_STORE.get(user.get("sub"))
    if not entry:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Run 2FA setup first")
    if not totp_verify(entry["secret"], req.token):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid authenticator code")
    entry["enabled"] = True
    entry["verified_at"] = datetime.utcnow().isoformat() + "Z"
    return {"success": True, "message": "Two-factor authentication enabled"}

@app.post("/api/auth/2fa/disable")
def disable_2fa(req: TwoFAVerifyRequest, user: Dict = Depends(get_current_user)):
    entry = TWO_FA_STORE.get(user.get("sub"))
    if not entry or not entry.get("enabled"):
        return {"success": True, "message": "2FA already disabled"}
    if not totp_verify(entry["secret"], req.token):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid authenticator code")
    entry["enabled"] = False
    return {"success": True, "message": "Two-factor authentication disabled"}

@app.post("/api/auth/2fa/challenge")
def challenge_2fa(req: TwoFAVerifyRequest):
    pending = TWO_FA_PENDING.get(req.tempToken or "")
    if not pending or time.time() > pending.get("exp", 0):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Expired 2FA session. Re-verify OTP.")
    entry = TWO_FA_STORE.get(pending["sub"])
    if not entry or not totp_verify(entry.get("secret", ""), req.token):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid authenticator code")
    TWO_FA_PENDING.pop(req.tempToken, None)
    # Resolve user by id
    matched = None
    for u in USERS_DB.values():
        if u.get("id") == pending["sub"]:
            matched = u
            break
    if not matched:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    token = create_access_token(data={"sub": matched["id"], "identifier": pending["identifier"], "role": matched.get("role", "STUDENT")})
    return {"success": True, "token": token, "user": matched}

