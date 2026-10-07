"""
services.stores — In-memory fallback stores for the Studentkare backend.

Centralises the in-memory demo stores so the repository layer can transparently
fall back to them when no persistent database is configured.  In production with
DATABASE_URL set, the repository reads/writes PostgreSQL and these stores are
only used as a cold-start cache.
"""
from __future__ import annotations

from typing import Dict, List

# ─── Auth / session stores ───────────────────────────────────────────────────
OTP_STORE: Dict[str, Dict] = {}
RATE_LIMIT_STORE: Dict[str, List[float]] = {}

# ─── Role-based master users ────────────────────────────────────────────────
USERS_DB: Dict[str, Dict] = {
    "9999999999": {
        "id": "admin_super_01",
        "fullName": "Dr. Vikram Sarabhai",
        "phone": "9999999999",
        "email": "super.admin@studentkare.co",
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
        "email": "cosigner.admin@studentkare.co",
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
        "email": "dr.ananya.rao@studentkare.co",
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
    },
}

# ─── Super Admin console stores ─────────────────────────────────────────────
BREAK_GLASS_SESSIONS_DB: Dict[str, Dict] = {}
AUDIT_LOGS_DB: List[Dict] = [
    {
        "id": "aud_init_001",
        "timestamp": "2026-01-01T00:00:00+00:00Z",
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
    },
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

# ─── Wearable / mobile sensor telemetry ingest ──────────────────────────────
SENSOR_TELEMETRY_DB: List[Dict] = []
