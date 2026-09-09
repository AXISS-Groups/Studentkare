"""Development-only sample data: sign-in accounts and the original catalog.

Refuses to run in production. Everything created here is explicitly marked as
sample data for local development and interaction testing — it must never be
presented as real products, providers, or verified users.
"""
from __future__ import annotations

import time

from sqlalchemy import select
from sqlalchemy.orm import Session

from core import workflow_models as M

DEMO_STUDENT = "demo.student@studentkare.test"
DEMO_ADMIN = "demo.admin@studentkare.test"
DEMO_VENDOR = "demo.vendor@studentkare.test"

SAMPLE_NOTE = "Sample development entry. Illustrative listing for local testing; not a real product, service, or medical advice."

# The original sample catalog: 12 products + 4 lab packages.
DEMO_CATALOG = [
    {"id": "demo-vitamin-c", "kind": "product", "name": "Vitamin C + Zinc Daily Support", "brand": "Nourish", "category": "vitamins", "pack": "Bottle of 60 tablets", "price_paise": 34900, "stock": 50, "description": f"{SAMPLE_NOTE} Vitamin and mineral supplement category."},
    {"id": "demo-sunscreen", "kind": "product", "name": "Daily Defence Sunscreen SPF 50", "brand": "Kindskin", "category": "skin", "pack": "Tube of 50 g cream", "price_paise": 42900, "stock": 50, "description": f"{SAMPLE_NOTE} Everyday sunscreen product concept."},
    {"id": "demo-omega", "kind": "product", "name": "Omega 3 Essential Softgels", "brand": "Nourish", "category": "vitamins", "pack": "Bottle of 60 softgels", "price_paise": 59900, "stock": 50, "description": f"{SAMPLE_NOTE} Dietary supplement category."},
    {"id": "demo-glucometer", "kind": "product", "name": "SmartCheck Blood Glucose Monitor", "brand": "CareSense", "category": "diabetes", "pack": "Kit with 10 sample strips", "price_paise": 79900, "stock": 30, "description": f"{SAMPLE_NOTE} Home monitoring kit concept. Follow a real device manual."},
    {"id": "demo-protein", "kind": "product", "name": "Everyday Plant Protein · Cocoa", "brand": "Nourish", "category": "nutrition", "pack": "Jar of 500 g powder", "price_paise": 89900, "stock": 40, "description": f"{SAMPLE_NOTE} Plant protein product concept. Check allergens on real products."},
    {"id": "demo-moisturiser", "kind": "product", "name": "Barrier Care Daily Moisturiser", "brand": "Kindskin", "category": "skin", "pack": "Tube of 100 ml lotion", "price_paise": 27900, "stock": 50, "description": f"{SAMPLE_NOTE} Everyday skincare concept. Patch-test real products."},
    {"id": "demo-first-aid", "kind": "product", "name": "Everyday First Aid Dressing Kit", "brand": "Kare Essentials", "category": "first-aid", "pack": "Box of 20 dressings", "price_paise": 14900, "stock": 60, "description": f"{SAMPLE_NOTE} Personal first-aid cupboard concept."},
    {"id": "demo-thermometer", "kind": "product", "name": "Flexi Digital Thermometer", "brand": "CareSense", "category": "devices", "pack": "Box of 1 device", "price_paise": 22900, "stock": 40, "description": f"{SAMPLE_NOTE} Digital thermometer concept. Illustration only."},
    {"id": "demo-herbal-tea", "kind": "product", "name": "Tulsi & Ginger Herbal Infusion", "brand": "Root & Ritual", "category": "ayurveda", "pack": "Box of 25 tea bags", "price_paise": 19900, "stock": 50, "description": f"{SAMPLE_NOTE} Caffeine-free herbal infusion concept."},
    {"id": "demo-multivitamin", "kind": "product", "name": "Daily Multivitamin Essentials", "brand": "Nourish", "category": "vitamins", "pack": "Bottle of 30 tablets", "price_paise": 29900, "stock": 50, "description": f"{SAMPLE_NOTE} Vitamin and mineral category. Not a substitute for a varied diet."},
    {"id": "demo-electrolyte", "kind": "product", "name": "Everyday Electrolyte Mix · Orange", "brand": "Kare Essentials", "category": "nutrition", "pack": "Box of 10 sachets", "price_paise": 17900, "stock": 50, "description": f"{SAMPLE_NOTE} Hydration product concept."},
    {"id": "demo-prescription-pack", "kind": "product", "name": "Prescription Care Pack · Sample Only", "brand": "Kare Essentials", "category": "medicines", "pack": "Illustrative prescription item", "price_paise": 12000, "stock": 20, "description": f"{SAMPLE_NOTE} Requires prescription review, which is not connected — ordering stays unavailable by design.", "requires_prescription": True},
    {"id": "demo-full-body", "kind": "lab", "name": "Complete Health Checkup", "brand": "Kare Labs", "category": "labs", "pack": "Includes 72 parameters", "price_paise": 149900, "stock": 0, "description": f"{SAMPLE_NOTE} Preventive-health package concept.", "preparation": "Sample preparation note: confirm fasting and collection with a real lab."},
    {"id": "demo-vitamin-panel", "kind": "lab", "name": "Vitamin D & B12 Check", "brand": "Kare Labs", "category": "labs", "pack": "Includes 2 parameters", "price_paise": 89900, "stock": 0, "description": f"{SAMPLE_NOTE} Vitamin measurement concept."},
    {"id": "demo-thyroid", "kind": "lab", "name": "Thyroid Profile", "brand": "Kare Labs", "category": "labs", "pack": "Includes 3 parameters", "price_paise": 39900, "stock": 0, "description": f"{SAMPLE_NOTE} Thyroid profile concept. Select tests with clinical advice."},
    {"id": "demo-diabetes-panel", "kind": "lab", "name": "Diabetes Care Checkup", "brand": "Kare Labs", "category": "labs", "pack": "Includes 8 parameters", "price_paise": 59900, "stock": 0, "description": f"{SAMPLE_NOTE} Blood-sugar checkup concept."},
]


def seed_demo_data(db: Session) -> dict:
    """Create demo accounts and the sample catalog. Idempotent: skips existing rows."""
    now = time.time()
    created = {"accounts": 0, "catalog": 0, "content": 0, "articles": 0}

    accounts = [
        (DEMO_STUDENT, "Demo Student", "STUDENT", {"dob": "2000-01-01", "university": "Demo University", "rollNumber": "DEMO-001", "bloodGroup": "O+", "ageVerified": False, "isVerifiedStudent": False}),
        (DEMO_ADMIN, "Demo Administrator", "SUPER_ADMIN", {}),
        (DEMO_VENDOR, "Demo Wellness Store", "VENDOR", {}),
    ]
    vendor = None
    for identifier, name, role, profile in accounts:
        existing = db.scalar(select(M.Account).where(M.Account.identifier == identifier))
        if existing is None:
            vendor_candidate = M.Account(id=f"demo-{role.lower()}", identifier=identifier, channel="EMAIL",
                                         full_name=name, role=role, active=True, profile=profile, created_at=now)
            db.add(vendor_candidate)
            created["accounts"] += 1
            if identifier == DEMO_VENDOR:
                vendor = vendor_candidate
        elif identifier == DEMO_VENDOR:
            vendor = existing
    db.flush()
    for entry in DEMO_CATALOG:
        if db.get(M.CatalogEntry, entry["id"]) is None:
            db.add(M.CatalogEntry(id=entry["id"], provider_id=vendor.id, kind=entry["kind"], name=entry["name"],
                                  brand=entry["brand"], category=entry["category"], description=entry["description"],
                                  pack=entry["pack"], price_paise=entry["price_paise"], stock=entry["stock"],
                                  active=True, requires_prescription=entry.get("requires_prescription", False),
                                  preparation=entry.get("preparation", "")))
            created["catalog"] += 1

    content_entries = [
        dict(key="hero", eyebrow="YOUR EVERYDAY HEALTH COMPANION", title="Care that connects.\nHealth that’s yours.", body="Keep your records together, explore listed care services, and follow every request from your own account.", action="Open my health workspace", target="health", icon="heart", color="lavender", sort=1),
        dict(key="aside", eyebrow="TAKE YOUR NEXT STEP", title="Find care from\nlisted providers.", body="Choose a listed service and send a request. Your provider confirms the time and arrangements.", action="Explore care", target="care", icon="flask", color="mint", sort=1),
        dict(key="feature-1", eyebrow="", title="Your records, together.", body="Upload and retrieve your own health documents from your private account.", action="", target="records", icon="file", color="lavender", sort=1),
        dict(key="feature-2", eyebrow="", title="Health checks, made clear.", body="Record your own measurements and view them as dated trends.", action="", target="health", icon="heart", color="mint", sort=2),
        dict(key="feature-3", eyebrow="", title="Your cover, in view.", body="Keep your policy details and understand your out-of-pocket estimate.", action="", target="insurance", icon="shield", color="peach", sort=3),
        dict(key="feature-4", eyebrow="", title="Support when you need it.", body="Send a request and follow its status with the platform team.", action="", target="support", icon="help", color="lavender", sort=4),
        dict(key="movement", eyebrow="SMALL STEPS, AT YOUR OWN PACE", title="Movement for everyday life.", body="Source-linked exercise guides and your saved session history.", action="Explore movement", target="movement", icon="activity", color="mint", sort=1),
        dict(key="lnk-records", title="Your health records", body="Save and access your own reports.", icon="file", target="records", sort=1),
        dict(key="lnk-metrics", title="Your medical metrics", body="Track actual readings you record.", icon="heart", target="health", sort=2),
        dict(key="lnk-insurance", title="Your insurance details", body="Keep policy information in view.", icon="shield", target="insurance", sort=3),
        dict(key="lnk-support", title="Support when you need it", body="Follow a saved support request.", icon="help", target="support", sort=4),
    ]
    for entry in content_entries:
        key = entry["key"]
        if db.get(M.HomeContent, key) is None:
            db.add(M.HomeContent(key=key, title=entry["title"], eyebrow=entry.get("eyebrow", ""),
                                 body=entry.get("body", ""), action=entry.get("action", ""),
                                 target=entry.get("target", ""), icon=entry.get("icon", "file"),
                                 color=entry.get("color", "lavender"), sort=entry.get("sort", 0), active=True))
            created["content"] += 1

    articles = [
        dict(id="art-sleep", tag="EVERYDAY WELLBEING", title="A little less scrolling. A little more sleep.", color="#e9e4f5", read_time="3 min read", body=["A repeatable wind-down routine can make bedtime feel less rushed. Try a quiet activity you enjoy and keep the room comfortable.", "Notice how caffeine, late meals, and screen time affect your own routine. Small, sustainable changes can be easier to keep than a complete reset.", "If sleep problems persist or affect daily life, speak with a qualified healthcare professional."]),
        dict(id="art-checkup", tag="PREVENTIVE CARE", title="Your first health checkup, made simpler.", color="#e3f0e9", read_time="4 min read", body=["Before booking, ask a clinician which tests are appropriate for your age, history, and concerns. More tests are not automatically better.", "Confirm preparation, sample collection, and report timing with the laboratory. Bring relevant prescriptions and previous reports.", "Review results with a qualified clinician rather than interpreting an isolated number on its own."]),
        dict(id="art-skincare", tag="SKIN & SELF-CARE", title="Keep your everyday skincare simple.", color="#f7e8df", read_time="3 min read", body=["A simple routine is often easier to follow consistently. Choose products suited to your skin and introduce changes gradually.", "Read product labels, check ingredients, and patch-test new products. Stop using a product if it causes irritation.", "For persistent skin concerns, consult a dermatologist instead of repeatedly adding new products."]),
    ]
    for entry in articles:
        if db.get(M.Article, entry["id"]) is None:
            db.add(M.Article(id=entry["id"], tag=entry["tag"], title=entry["title"], read_time=entry["read_time"],
                             color=entry["color"], body=entry["body"], active=True, sort=0))
            created["articles"] += 1

    db.commit()
    return created