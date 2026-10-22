"""Development-only sample data: sign-in accounts and the original catalog.

Refuses to run in production. Everything created here is explicitly marked as
sample data for local development and interaction testing — it must never be
presented as real products, providers, or verified users.
"""
from __future__ import annotations

import os
import time

from sqlalchemy import select
from sqlalchemy.orm import Session

from core import workflow_models as M
from core.app_env import app_env
from core.medicine_composition import composition_key, requires_prescription_for, salt_key
from services.demo_medicines import DEMO_MEDICINES, demo_medicine_listings

DEMO_STUDENT = "demo.student@studentkare.test"
DEMO_ADMIN = "demo.admin@studentkare.test"
DEMO_VENDOR = "demo.vendor@studentkare.test"
DEMO_DOCTOR = "demo.doctor@studentkare.test"
DEMO_CAMPUS = "demo.campus@studentkare.test"

DEMO_STUDENT_PHONE = "9876543210"
DEMO_ADMIN_PHONE = "9876543211"
DEMO_VENDOR_PHONE = "9876543212"
DEMO_DOCTOR_PHONE = "9876543213"
DEMO_CAMPUS_PHONE = "9876543214"

DEMO_IDENTIFIERS = frozenset({
    DEMO_STUDENT, DEMO_ADMIN, DEMO_VENDOR, DEMO_DOCTOR, DEMO_CAMPUS,
    DEMO_STUDENT_PHONE, DEMO_ADMIN_PHONE, DEMO_VENDOR_PHONE, DEMO_DOCTOR_PHONE, DEMO_CAMPUS_PHONE,
})

# Environments that may hold demo accounts. An allow-list, so an unset,
# misspelt or new APP_ENV ("prod", "staging") gets no demo accounts and no
# fixed OTP — the check fails closed (AGENTS.md guardrails 1 and 2).
DEMO_ENVIRONMENTS = frozenset({"development", "testing"})


def demo_accounts_enabled() -> bool:
    """True only in an explicit development or test environment that also opts in.

    Both are required: APP_ENV must be development/testing AND SEED_DEMO_DATA
    must be "true". A shared box labelled APP_ENV=testing gets no demo accounts
    (and so no seeded SUPER_ADMIN) unless someone deliberately turns them on.
    """
    if app_env() not in DEMO_ENVIRONMENTS:
        return False
    return os.getenv("SEED_DEMO_DATA", "false").strip().lower() == "true"


def is_demo_identifier(identifier: str) -> bool:
    """A demo account's identifier, and demo accounts are enabled here."""
    return demo_accounts_enabled() and (identifier in DEMO_IDENTIFIERS or identifier.endswith("@studentkare.test"))


SAMPLE_NOTE = "Sample development entry. Illustrative listing for local testing; not a real product, service, or medical advice."

# The demo laboratory. Its name says it is a sample; it claims no accreditation
# and no licence, and its prices are illustrative, not anyone's real prices.
DEMO_LAB_BRAND = "Demo Diagnostics (sample lab)"
DEMO_LAB = "demo.lab@studentkare.test"
DEMO_LAB_PROVIDER_ID = "demo-lab-provider"
DEMO_COLLECTORS = (
    ("demo.collector1@studentkare.test", "Demo Collector One (sample)"),
    ("demo.collector2@studentkare.test", "Demo Collector Two (sample)"),
)

# Which tests each demo lab package is made of (names only), fasting and the
# stated report time. Illustrative: confirm real preparation with a real lab.
DEMO_LAB_PACKAGES = {
    "demo-full-body": {"pack": "10 tests · sample package", "fasting_hours": 10, "report_hours": 24, "includes": [
        "Complete blood count", "Lipid profile", "Liver function test", "Kidney function test", "Thyroid profile",
        "Fasting blood sugar", "HbA1c", "Urine routine", "Vitamin D (25-OH)", "Vitamin B12"]},
    "demo-vitamin-panel": {"pack": "2 tests · sample package", "fasting_hours": 0, "report_hours": 24,
                           "includes": ["Vitamin D (25-OH)", "Vitamin B12"]},
    "demo-thyroid": {"pack": "3 tests · sample package", "fasting_hours": 0, "report_hours": 12,
                     "includes": ["T3 (total)", "T4 (total)", "TSH"]},
    "demo-iron-panel": {"pack": "4 tests · sample package", "fasting_hours": 10, "report_hours": 24,
                        "includes": ["Haemoglobin", "Serum iron", "Total iron-binding capacity", "Ferritin"]},
    "demo-cbc": {"pack": "1 test · sample", "fasting_hours": 0, "report_hours": 12,
                 "includes": ["Complete blood count"]},
}

# Sample catalog: products, lab packages, and consultations.
# price_paise is the request price; mrp_paise is the displayed strike-through
# maximum retail price so the storefront can show a realistic "% off" badge.
DEMO_CATALOG = [
        {"id": "demo-vitamin-c", "kind": "product", "name": "Vitamin C + Zinc Daily Support", "brand": "Nourish", "category": "vitamins", "pack": "Bottle of 60 tablets", "price_paise": 34900, "mrp_paise": 49900, "stock": 50, "description": f"{SAMPLE_NOTE} Vitamin and mineral supplement category."},
        {"id": "demo-sunscreen", "kind": "product", "name": "Daily Defence Sunscreen SPF 50", "brand": "Kindskin", "category": "skin", "pack": "Tube of 50 g cream", "price_paise": 42900, "mrp_paise": 59900, "stock": 50, "description": f"{SAMPLE_NOTE} Everyday sunscreen product concept."},
        {"id": "demo-omega", "kind": "product", "name": "Omega 3 Essential Softgels", "brand": "Nourish", "category": "vitamins", "pack": "Bottle of 60 softgels", "price_paise": 59900, "mrp_paise": 89900, "stock": 50, "description": f"{SAMPLE_NOTE} Dietary supplement category."},
        {"id": "demo-glucometer", "kind": "product", "name": "SmartCheck Blood Glucose Monitor", "brand": "CareSense", "category": "devices", "pack": "Kit with 10 sample strips", "price_paise": 79900, "mrp_paise": 129900, "stock": 30, "description": f"{SAMPLE_NOTE} Home monitoring kit concept. Follow a real device manual."},
        {"id": "demo-protein", "kind": "product", "name": "Everyday Plant Protein · Cocoa", "brand": "Nourish", "category": "nutrition", "pack": "Jar of 500 g powder", "price_paise": 89900, "mrp_paise": 119900, "stock": 40, "description": f"{SAMPLE_NOTE} Plant protein product concept. Check allergens on real products."},
        {"id": "demo-moisturiser", "kind": "product", "name": "Barrier Care Daily Moisturiser", "brand": "Kindskin", "category": "skin", "pack": "Tube of 100 ml lotion", "price_paise": 27900, "mrp_paise": 39900, "stock": 50, "description": f"{SAMPLE_NOTE} Everyday skincare concept. Patch-test real products."},
        {"id": "demo-first-aid", "kind": "product", "name": "Everyday First Aid Dressing Kit", "brand": "Kare Essentials", "category": "first-aid", "pack": "Box of 20 dressings", "price_paise": 14900, "mrp_paise": 19900, "stock": 60, "description": f"{SAMPLE_NOTE} Personal first-aid cupboard concept."},
        {"id": "demo-thermometer", "kind": "product", "name": "Flexi Digital Thermometer", "brand": "CareSense", "category": "devices", "pack": "Box of 1 device", "price_paise": 22900, "mrp_paise": 34900, "stock": 40, "description": f"{SAMPLE_NOTE} Digital thermometer concept. Illustration only."},
        {"id": "demo-herbal-tea", "kind": "product", "name": "Tulsi & Ginger Herbal Infusion", "brand": "Root & Ritual", "category": "ayurveda", "pack": "Box of 25 tea bags", "price_paise": 19900, "mrp_paise": 29900, "stock": 50, "description": f"{SAMPLE_NOTE} Caffeine-free herbal infusion concept."},
        {"id": "demo-multivitamin", "kind": "product", "name": "Daily Multivitamin Essentials", "brand": "Nourish", "category": "vitamins", "pack": "Bottle of 30 tablets", "price_paise": 29900, "mrp_paise": 44900, "stock": 50, "description": f"{SAMPLE_NOTE} Vitamin and mineral category. Not a substitute for a varied diet."},
        {"id": "demo-electrolyte", "kind": "product", "name": "Everyday Electrolyte Mix · Orange", "brand": "Kare Essentials", "category": "nutrition", "pack": "Box of 10 sachets", "price_paise": 17900, "mrp_paise": 24900, "stock": 50, "description": f"{SAMPLE_NOTE} Hydration product concept."},
        {"id": "demo-prescription-pack", "kind": "product", "name": "Prescription Care Pack · Sample Only", "brand": "Kare Essentials", "category": "medicines", "pack": "Illustrative prescription item", "price_paise": 12000, "mrp_paise": 15000, "stock": 20, "description": f"{SAMPLE_NOTE} Requires prescription review, which is not connected — ordering stays unavailable by design.", "requires_prescription": True},
        {"id": "demo-ashwagandha", "kind": "product", "name": "Ashwagandha Stress Balance", "brand": "Root & Ritual", "category": "ayurveda", "pack": "Bottle of 60 capsules", "price_paise": 29900, "mrp_paise": 44900, "stock": 45, "description": f"{SAMPLE_NOTE} Herbal stress-support concept."},
        {"id": "demo-sleep-gummies", "kind": "product", "name": "Night Rest Melatonin Gummies", "brand": "Nourish", "category": "vitamins", "pack": "Bottle of 30 gummies", "price_paise": 39900, "mrp_paise": 59900, "stock": 50, "description": f"{SAMPLE_NOTE} Nighttime sleep supplement concept."},
        {"id": "demo-salicylic-wash", "kind": "product", "name": "Clarifying Face Wash SPF 15", "brand": "Kindskin", "category": "skin", "pack": "Tube of 150 ml cleanser", "price_paise": 32900, "mrp_paise": 49900, "stock": 60, "description": f"{SAMPLE_NOTE} Everyday facial cleanser concept."},
        {"id": "demo-pulse-oximeter", "kind": "product", "name": "Fingertip Pulse Oximeter", "brand": "CareSense", "category": "devices", "pack": "Box with 1 monitor", "price_paise": 69900, "mrp_paise": 99900, "stock": 35, "description": f"{SAMPLE_NOTE} Digital oxygen-saturation monitor concept."},
        {"id": "demo-creatine", "kind": "product", "name": "Micronized Creatine Monohydrate", "brand": "Nourish", "category": "nutrition", "pack": "Jar of 250 g powder", "price_paise": 79900, "mrp_paise": 109900, "stock": 40, "description": f"{SAMPLE_NOTE} Unflavoured sports nutrition powder concept."},
        {"id": "demo-sanitiser-spray", "kind": "product", "name": "Multi-Surface Antiseptic Spray", "brand": "Kare Essentials", "category": "first-aid", "pack": "Bottle of 200 ml spray", "price_paise": 12900, "mrp_paise": 17900, "stock": 80, "description": f"{SAMPLE_NOTE} Disinfectant spray concept for personal care."},
        {"id": "demo-eye-drops", "kind": "product", "name": "Lubricating Eye Refresh Drops", "brand": "Kare Essentials", "category": "medicines", "pack": "Vial of 10 ml drops", "price_paise": 18900, "mrp_paise": 24900, "stock": 50, "description": f"{SAMPLE_NOTE} Screen-relief eye lubricant concept."},
        {"id": "demo-neem-pack", "kind": "product", "name": "Purifying Neem & Charcoal Mask", "brand": "Root & Ritual", "category": "skin", "pack": "Jar of 100 g face mask", "price_paise": 25900, "mrp_paise": 37900, "stock": 45, "description": f"{SAMPLE_NOTE} Deep-cleansing botanical skin care concept."},
        {"id": "demo-full-body", "kind": "lab", "name": "Complete Health Checkup", "brand": DEMO_LAB_BRAND, "category": "labs", "pack": "Includes 72 parameters", "price_paise": 149900, "mrp_paise": 299900, "stock": 0, "description": f"{SAMPLE_NOTE} Preventive-health package concept.", "preparation": "Sample preparation note: confirm fasting and collection with a real lab."},
        {"id": "demo-vitamin-panel", "kind": "lab", "name": "Vitamin D & B12 Check", "brand": DEMO_LAB_BRAND, "category": "labs", "pack": "Includes 2 parameters", "price_paise": 89900, "mrp_paise": 159900, "stock": 0, "description": f"{SAMPLE_NOTE} Vitamin measurement concept."},
        {"id": "demo-thyroid", "kind": "lab", "name": "Thyroid Profile", "brand": DEMO_LAB_BRAND, "category": "labs", "pack": "Includes 3 parameters", "price_paise": 39900, "mrp_paise": 69900, "stock": 0, "description": f"{SAMPLE_NOTE} Thyroid profile concept. Select tests with clinical advice."},
        {"id": "demo-diabetes-panel", "kind": "lab", "name": "Diabetes Care Checkup", "brand": DEMO_LAB_BRAND, "category": "labs", "pack": "Includes 8 parameters", "price_paise": 59900, "mrp_paise": 99900, "stock": 0, "description": f"{SAMPLE_NOTE} Blood-sugar checkup concept."},
        {"id": "demo-iron-panel", "kind": "lab", "name": "Anemia & Iron Deficiency Panel", "brand": DEMO_LAB_BRAND, "category": "labs", "pack": "Includes 4 parameters", "price_paise": 69900, "mrp_paise": 119900, "stock": 0, "description": f"{SAMPLE_NOTE} Ferritin and serum iron checkup concept."},
        {"id": "demo-allergy-screen", "kind": "lab", "name": "Food & Dust Allergy Screen", "brand": DEMO_LAB_BRAND, "category": "labs", "pack": "Includes 24 IgE parameters", "price_paise": 129900, "mrp_paise": 219900, "stock": 0, "description": f"{SAMPLE_NOTE} Common allergen screening concept."},
        {"id": "demo-lipid-profile", "kind": "lab", "name": "Lipid Profile & Cardiac Screening", "brand": DEMO_LAB_BRAND, "category": "labs", "pack": "Includes 6 parameters", "price_paise": 49900, "mrp_paise": 89900, "stock": 0, "description": f"{SAMPLE_NOTE} Cholesterol and triglyceride assessment concept."},
        {"id": "demo-general-consult", "kind": "consultation", "name": "General Physician Teleconsultation", "brand": "Studentkare Care", "category": "general-care", "pack": "30-minute online video consult", "price_paise": 29900, "mrp_paise": 49900, "stock": 0, "description": f"{SAMPLE_NOTE} Telehealth consultation concept with a verified doctor."},
        {"id": "demo-derma-consult", "kind": "consultation", "name": "Skincare & Dermatology Consult", "brand": "Kindskin Care", "category": "skin", "pack": "20-minute specialist consult", "price_paise": 49900, "mrp_paise": 79900, "stock": 0, "description": f"{SAMPLE_NOTE} Specialist skin assessment session concept."},
        {"id": "demo-nutrition-consult", "kind": "consultation", "name": "Dietitian & Nutrition Advisory", "brand": "Nourish Care", "category": "nutrition", "pack": "45-minute nutrition planning session", "price_paise": 39900, "mrp_paise": 59900, "stock": 0, "description": f"{SAMPLE_NOTE} Student meal-planning and nutrition consult concept."},
        # Shop by health concern — everyday-care product concepts.
        {"id": "demo-sugar-balance", "kind": "product", "name": "Sugar Balance Daily Support", "brand": "Nourish", "category": "diabetes", "pack": "Bottle of 60 tablets", "price_paise": 34900, "mrp_paise": 49900, "stock": 45, "description": f"{SAMPLE_NOTE} Everyday wellness supplement concept for the diabetes-care shelf. Not a treatment or a substitute for prescribed care."},
        {"id": "demo-cardiac-coq10", "kind": "product", "name": "Cardiac Care CoQ10 Softgels", "brand": "Nourish", "category": "heart", "pack": "Bottle of 60 softgels", "price_paise": 64900, "mrp_paise": 89900, "stock": 40, "description": f"{SAMPLE_NOTE} Heart-health shelf supplement concept. Check ingredients and suitability with a clinician."},
        {"id": "demo-gut-relief", "kind": "product", "name": "Gut Relief Antacid Chewables", "brand": "Kare Essentials", "category": "stomach", "pack": "Box of 20 chewable tablets", "price_paise": 14900, "mrp_paise": 19900, "stock": 60, "description": f"{SAMPLE_NOTE} Over-the-counter digestive-care product concept. Persistent symptoms need clinical advice."},
        {"id": "demo-liver-drops", "kind": "product", "name": "Liver Care Herbal Drops", "brand": "Root & Ritual", "category": "liver", "pack": "Bottle of 30 ml drops", "price_paise": 27900, "mrp_paise": 39900, "stock": 40, "description": f"{SAMPLE_NOTE} Botanical liver-care shelf concept. Herbal products can interact with medicines."},
        {"id": "demo-joint-care", "kind": "product", "name": "Joint Mobility Calcium + D3", "brand": "Nourish", "category": "bone-joint", "pack": "Bottle of 60 tablets", "price_paise": 39900, "mrp_paise": 54900, "stock": 50, "description": f"{SAMPLE_NOTE} Bone and joint shelf supplement concept. Not a treatment for injury or disease."},
        {"id": "demo-kidney-blend", "kind": "product", "name": "Kidney Care Herbal Blend", "brand": "Root & Ritual", "category": "kidney", "pack": "Box of 30 sachets", "price_paise": 31900, "mrp_paise": 44900, "stock": 35, "description": f"{SAMPLE_NOTE} Kidney-care shelf herbal concept. Confirm suitability with a clinician."},
        {"id": "demo-derma-cream", "kind": "product", "name": "Derma Barrier Repair Cream", "brand": "Kindskin", "category": "skin", "pack": "Tube of 100 g cream", "price_paise": 45900, "mrp_paise": 64900, "stock": 55, "description": f"{SAMPLE_NOTE} Derma-care moisturising product concept. Patch-test real products and consult a dermatologist for persistent concerns."},
        {"id": "demo-steam-balm", "kind": "product", "name": "Respiratory Steam Relief Balm", "brand": "Kare Essentials", "category": "respiratory", "pack": "Jar of 50 g balm", "price_paise": 19900, "mrp_paise": 27900, "stock": 50, "description": f"{SAMPLE_NOTE} Respiratory-comfort topical balm concept. Breathlessness needs urgent medical care."},
        {"id": "demo-eye-lubricant", "kind": "product", "name": "Eye Care Lubricant Drops", "brand": "Kare Essentials", "category": "eye", "pack": "Vial of 10 ml drops", "price_paise": 21900, "mrp_paise": 29900, "stock": 50, "description": f"{SAMPLE_NOTE} Eye-care lubricant concept for screen-heavy days. Sudden vision changes need prompt clinical review."},
        # Additional everyday products.
        {"id": "demo-bp-monitor", "kind": "product", "name": "Digital Blood Pressure Monitor", "brand": "CareSense", "category": "devices", "pack": "Box with 1 monitor and cuff", "price_paise": 189900, "mrp_paise": 249900, "stock": 25, "description": f"{SAMPLE_NOTE} Upper-arm blood-pressure monitor concept. Follow the actual device manual and clinical advice."},
        {"id": "demo-ayur-immunity", "kind": "product", "name": "Ayurvedic Immunity Kadha Mix", "brand": "Root & Ritual", "category": "ayurveda", "pack": "Jar of 200 g mix", "price_paise": 24900, "mrp_paise": 34900, "stock": 50, "description": f"{SAMPLE_NOTE} Traditional herbal infusion mix concept. Check ingredients and suitability before use."},
        {"id": "demo-protein-bars", "kind": "product", "name": "Protein Snack Bars · Variety", "brand": "Nourish", "category": "nutrition", "pack": "Box of 6 bars", "price_paise": 29900, "mrp_paise": 39900, "stock": 60, "description": f"{SAMPLE_NOTE} Everyday protein snack concept. Check allergens on real products."},
        # Adult vaccination services.
        {"id": "demo-flu-vaccine", "kind": "vaccine", "name": "Seasonal Influenza Adult Vaccine", "brand": "Studentkare Care", "category": "vaccines", "pack": "Single adult dose with eligibility check", "price_paise": 89900, "mrp_paise": 119900, "stock": 0, "description": f"{SAMPLE_NOTE} Adult influenza vaccination request concept. Suitability and timing are decided by a qualified clinician.", "preparation": "Eligibility and any current illness are reviewed by the clinician before a dose is given."},
        {"id": "demo-hepb-vaccine", "kind": "vaccine", "name": "Hepatitis B Adult Vaccine Course", "brand": "Studentkare Care", "category": "vaccines", "pack": "Three-dose adult course", "price_paise": 189900, "mrp_paise": 249900, "stock": 0, "description": f"{SAMPLE_NOTE} Adult hepatitis B course request concept. A clinician confirms the schedule and eligibility.", "preparation": "Doses follow a clinician-set schedule; this listing does not reserve or administer a dose."},
        {"id": "demo-td-booster", "kind": "vaccine", "name": "Tetanus & Diphtheria Booster", "brand": "Studentkare Care", "category": "vaccines", "pack": "Single adult booster dose", "price_paise": 69900, "mrp_paise": 89900, "stock": 0, "description": f"{SAMPLE_NOTE} Adult tetanus and diphtheria booster request concept. Wounds needing urgent care are not handled here.", "preparation": "A clinician reviews your history before a booster is given."},
        {"id": "demo-hpv-vaccine", "kind": "vaccine", "name": "HPV Adult Vaccine Series", "brand": "Studentkare Care", "category": "vaccines", "pack": "Multi-dose adult series", "price_paise": 249900, "mrp_paise": 319900, "stock": 0, "description": f"{SAMPLE_NOTE} Adult HPV vaccination series request concept. A clinician confirms eligibility and dosing.", "preparation": "Discuss eligibility, timing and cost with a qualified clinician before booking."},
        # Additional NABL lab packages.
        {"id": "demo-fever-panel", "kind": "lab", "name": "Fever Panel (Dengue, Malaria, Typhoid)", "brand": DEMO_LAB_BRAND, "category": "labs", "pack": "Includes 12 parameters", "price_paise": 99900, "mrp_paise": 159900, "stock": 0, "description": f"{SAMPLE_NOTE} Fever investigation package concept. High or worsening fever needs prompt clinical care.", "preparation": "Sample preparation: no fasting usually required. Confirm with the actual lab."},
        {"id": "demo-lft", "kind": "lab", "name": "Liver Function Test (LFT)", "brand": DEMO_LAB_BRAND, "category": "labs", "pack": "Includes 11 parameters", "price_paise": 44900, "mrp_paise": 69900, "stock": 0, "description": f"{SAMPLE_NOTE} Liver panel concept covering common liver markers.", "preparation": "Sample preparation: fasting may be advised. Confirm with the actual lab."},
        {"id": "demo-kft", "kind": "lab", "name": "Kidney Function Test (KFT)", "brand": DEMO_LAB_BRAND, "category": "labs", "pack": "Includes 8 parameters", "price_paise": 49900, "mrp_paise": 79900, "stock": 0, "description": f"{SAMPLE_NOTE} Kidney panel concept covering common renal markers.", "preparation": "Sample preparation: hydration advice varies. Confirm with the actual lab."},
        {"id": "demo-cbc", "kind": "lab", "name": "Complete Blood Count (CBC)", "brand": DEMO_LAB_BRAND, "category": "labs", "pack": "Includes 21 parameters", "price_paise": 31900, "mrp_paise": 49900, "stock": 0, "description": f"{SAMPLE_NOTE} Complete blood count concept covering common cell indices.", "preparation": "Sample preparation: no fasting usually required. Confirm with the actual lab."},
        {"id": "demo-vitb12", "kind": "lab", "name": "Vitamin B12 & Folate Check", "brand": DEMO_LAB_BRAND, "category": "labs", "pack": "Includes 2 parameters", "price_paise": 74900, "mrp_paise": 119900, "stock": 0, "description": f"{SAMPLE_NOTE} Vitamin B12 and folate measurement concept.", "preparation": "Sample preparation: no fasting usually required. Confirm with the actual lab."},
    ] + demo_medicine_listings()   # demo medicines, each linked to its demo master record


DEMO_BLOOD_GROUP = "O+"


def seed_demo_data(db: Session, include_demo_users: bool = True) -> dict:
    """Create demo accounts and the sample catalog. Idempotent: skips existing rows.

    When ``include_demo_users`` is False, only the vendor provider account and the
    catalog/storefront content are written (no student or administrator accounts),
    which is what ``seed_catalog_data`` uses to populate a deployed environment.
    """
    now = time.time()
    created = {"accounts": 0, "catalog": 0, "medicines": 0, "content": 0, "articles": 0, "posts": 0}

    accounts = [
        (DEMO_STUDENT, "Demo Student", "STUDENT", "EMAIL", {"dob": "2000-01-01", "university": "Demo University", "rollNumber": "DEMO-001", "ageVerified": False, "isVerifiedStudent": False}),
        (DEMO_ADMIN, "Demo Administrator", "SUPER_ADMIN", "EMAIL", {}),
        (DEMO_VENDOR, "Demo Wellness Store", "VENDOR", "EMAIL", {}),
        (DEMO_DOCTOR, "Demo Clinician", "NMC_DOCTOR", "EMAIL", {}),
        (DEMO_CAMPUS, "Demo Campus Admin", "CAMPUS_ADMIN", "EMAIL", {"university": "Demo University"}),
        (DEMO_STUDENT_PHONE, "Demo Student (Mobile)", "STUDENT", "WHATSAPP", {"dob": "2000-01-01", "university": "Demo University", "rollNumber": "DEMO-002", "ageVerified": False, "isVerifiedStudent": False}),
        (DEMO_ADMIN_PHONE, "Demo Administrator (Mobile)", "SUPER_ADMIN", "WHATSAPP", {}),
        (DEMO_VENDOR_PHONE, "Demo Wellness Store (Mobile)", "VENDOR", "WHATSAPP", {}),
        (DEMO_DOCTOR_PHONE, "Demo Clinician (Mobile)", "NMC_DOCTOR", "WHATSAPP", {}),
        (DEMO_CAMPUS_PHONE, "Demo Campus Admin (Mobile)", "CAMPUS_ADMIN", "WHATSAPP", {"university": "Demo University"}),
    ]
    vendor = None
    for identifier, name, role, channel, profile in accounts:
        if not include_demo_users and identifier != DEMO_VENDOR:
            continue
        existing = db.scalar(select(M.Account).where(M.Account.identifier == identifier))
        if existing is None:
            acc_id = f"demo-{role.lower()}" if channel == "EMAIL" else f"demo-{role.lower()}-phone"
            vendor_candidate = M.Account(id=acc_id, identifier=identifier, channel=channel,
                                         full_name=name, role=role, active=True, profile=profile, created_at=now,
                                         staff_campus=profile.get("university", "") if role in ("CAMPUS_ADMIN", "COUNSELLOR") else "",
                                         # The demo store sells an OTC catalogue, so it gets the pharmacy dashboard.
                                         partner_kind="PHARMACY" if role == "VENDOR" else "")
            db.add(vendor_candidate)
            if role == "STUDENT":
                # The demo students' typed blood group, on the clinical plane (services/clinical_profile.py).
                db.add(M.ClinicalProfile(account_id=acc_id, blood_group=DEMO_BLOOD_GROUP, allergies=[],
                                         no_known_allergies=False, updated_at=now))
            created["accounts"] += 1
            if identifier == DEMO_VENDOR:
                vendor = vendor_candidate
        elif identifier == DEMO_VENDOR:
            vendor = existing
    db.flush()
    # The demo students signed up like anyone else: their campus request waits in the campus queue.
    for identifier, _name, role, _channel, profile in accounts:
        if role != "STUDENT" or not include_demo_users:
            continue
        student = db.scalar(select(M.Account).where(M.Account.identifier == identifier))
        if student is not None and db.get(M.CampusVerification, student.id) is None:
            db.add(M.CampusVerification(account_id=student.id, university=profile["university"],
                                        roll_number=profile["rollNumber"], status="PENDING"))
    db.flush()
    # Demo medicine master rows (source DEMO_SEED), before the listings that point at them.
    for medicine_id, name, ingredients, form, pack, manufacturer, schedule, _price, _mrp in DEMO_MEDICINES:
        if db.get(M.Medicine, medicine_id) is not None:
            continue
        db.add(M.Medicine(id=medicine_id, name=name, composition_key=composition_key(ingredients), dosage_form=form,
                          pack=pack, manufacturer=manufacturer, schedule=schedule,
                          requires_prescription=requires_prescription_for(schedule), active=True,
                          source="DEMO_SEED", created_at=now, updated_at=now))
        for position, (salt, value, unit) in enumerate(ingredients):
            db.add(M.MedicineIngredient(id=f"{medicine_id}-{position}", medicine_id=medicine_id, position=position,
                                        salt=salt, salt_key=salt_key(salt), strength_value=value, strength_unit=unit))
        created["medicines"] += 1
    db.flush()
    lab_owner = None
    # Consultations are a doctor's (CATALOG_PROVIDER_ROLES): with demo users, the demo doctor
    # provides them, so a booking reaches a doctor in dev (live-run audit #7).
    doctor = db.scalar(select(M.Account).where(M.Account.identifier == DEMO_DOCTOR)) if include_demo_users else None
    if include_demo_users:
        lab_owner, created["lab"] = _seed_demo_lab(db, now)
    for entry in DEMO_CATALOG:
        package = DEMO_LAB_PACKAGES.get(entry["id"]) if lab_owner is not None else None
        existing_entry = db.get(M.CatalogEntry, entry["id"])
        if existing_entry is not None and package and existing_entry.provider_id == vendor.id:
            # A dev database seeded before the demo lab existed: hand its sample tests to the lab.
            existing_entry.provider_id = lab_owner.id
            existing_entry.brand = DEMO_LAB_BRAND
            existing_entry.pack = package["pack"]
            existing_entry.includes = package["includes"]
            existing_entry.fasting_hours = package["fasting_hours"]
            existing_entry.report_hours = package["report_hours"]
        if existing_entry is not None and doctor is not None and entry["kind"] == "consultation" \
                and existing_entry.provider_id == vendor.id:
            # A dev database seeded when the demo vendor held the consults: hand them to the doctor.
            existing_entry.provider_id = doctor.id
        if existing_entry is None and package:
            db.add(M.CatalogEntry(id=entry["id"], provider_id=lab_owner.id, kind=entry["kind"], name=entry["name"],
                                  brand=DEMO_LAB_BRAND, category=entry["category"], description=entry["description"],
                                  pack=package["pack"], price_paise=entry["price_paise"], mrp_paise=entry.get("mrp_paise", 0),
                                  stock=entry["stock"], active=True, requires_prescription=False,
                                  preparation=entry.get("preparation", ""), includes=package["includes"],
                                  fasting_hours=package["fasting_hours"], report_hours=package["report_hours"]))
            created["catalog"] += 1
        elif existing_entry is None:
            owner = doctor if doctor is not None and entry["kind"] == "consultation" else vendor
            db.add(M.CatalogEntry(id=entry["id"], provider_id=owner.id, kind=entry["kind"], name=entry["name"],
                                  brand=entry["brand"], category=entry["category"], description=entry["description"],
                                  pack=entry["pack"], price_paise=entry["price_paise"], mrp_paise=entry.get("mrp_paise", 0), stock=entry["stock"],
                                  active=True, requires_prescription=entry.get("requires_prescription", False),
                                  preparation=entry.get("preparation", ""), medicine_id=entry.get("medicine_id")))
            created["catalog"] += 1
    if lab_owner is not None:
        db.flush()
        created["lab"]["slots"] = _seed_demo_lab_slots(db, lab_owner, now)
    if doctor is not None:
        db.flush()
        created["consultSlots"] = _seed_demo_consult_slots(db, doctor, now)

    content_entries = [
        {"key": "hero", "eyebrow": "YOUR EVERYDAY HEALTH COMPANION", "title": "Care that connects.\nHealth that’s yours.", "body": "Keep your records together, explore listed care services, and follow every request from your own account.", "action": "Open my health workspace", "target": "health", "icon": "heart", "color": "lavender", "sort": 1},
        {"key": "aside", "eyebrow": "TAKE YOUR NEXT STEP", "title": "Find care from\nlisted providers.", "body": "Choose a listed service and send a request. Your provider confirms the time and arrangements.", "action": "Explore care", "target": "care", "icon": "flask", "color": "mint", "sort": 1},
        {"key": "feature-1", "eyebrow": "", "title": "Your records, together.", "body": "Upload and retrieve your own health documents from your private account.", "action": "", "target": "records", "icon": "file", "color": "lavender", "sort": 1},
        {"key": "feature-2", "eyebrow": "", "title": "Health checks, made clear.", "body": "Record your own measurements and view them as dated trends.", "action": "", "target": "health", "icon": "heart", "color": "mint", "sort": 2},
        {"key": "feature-3", "eyebrow": "", "title": "Your cover, in view.", "body": "Keep your policy details and understand your out-of-pocket estimate.", "action": "", "target": "insurance", "icon": "shield", "color": "peach", "sort": 3},
        {"key": "feature-4", "eyebrow": "", "title": "Support when you need it.", "body": "Send a request and follow its status with the platform team.", "action": "", "target": "support", "icon": "help", "color": "lavender", "sort": 4},
        {"key": "movement", "eyebrow": "SMALL STEPS, AT YOUR OWN PACE", "title": "Movement for everyday life.", "body": "Source-linked exercise guides and your saved session history.", "action": "Explore movement", "target": "movement", "icon": "activity", "color": "mint", "sort": 1},
        {"key": "lnk-records", "title": "Your health records", "body": "Save and access your own reports.", "icon": "file", "target": "records", "sort": 1},
        {"key": "lnk-metrics", "title": "Your medical metrics", "body": "Track actual readings you record.", "icon": "heart", "target": "health", "sort": 2},
        {"key": "lnk-insurance", "title": "Your insurance details", "body": "Keep policy information in view.", "icon": "shield", "target": "insurance", "sort": 3},
        {"key": "lnk-support", "title": "Support when you need it", "body": "Follow a saved support request.", "icon": "help", "target": "support", "sort": 4},
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
        {"id": "art-sleep", "tag": "EVERYDAY WELLBEING", "title": "A little less scrolling. A little more sleep.", "color": "#e9e4f5", "read_time": "3 min read", "body": ["A repeatable wind-down routine can make bedtime feel less rushed. Try a quiet activity you enjoy and keep the room comfortable.", "Notice how caffeine, late meals, and screen time affect your own routine. Small, sustainable changes can be easier to keep than a complete reset.", "If sleep problems persist or affect daily life, speak with a qualified healthcare professional."]},
        {"id": "art-checkup", "tag": "PREVENTIVE CARE", "title": "Your first health checkup, made simpler.", "color": "#e3f0e9", "read_time": "4 min read", "body": ["Before booking, ask a clinician which tests are appropriate for your age, history, and concerns. More tests are not automatically better.", "Confirm preparation, sample collection, and report timing with the laboratory. Bring relevant prescriptions and previous reports.", "Review results with a qualified clinician rather than interpreting an isolated number on its own."]},
        {"id": "art-skincare", "tag": "SKIN & SELF-CARE", "title": "Keep your everyday skincare simple.", "color": "#f7e8df", "read_time": "3 min read", "body": ["A simple routine is often easier to follow consistently. Choose products suited to your skin and introduce changes gradually.", "Read product labels, check ingredients, and patch-test new products. Stop using a product if it causes irritation.", "For persistent skin concerns, consult a dermatologist instead of repeatedly adding new products."]},
    ]
    for entry in articles:
        if db.get(M.Article, entry["id"]) is None:
            db.add(M.Article(id=entry["id"], tag=entry["tag"], title=entry["title"], read_time=entry["read_time"],
                             color=entry["color"], body=entry["body"], active=True, sort=0))
            created["articles"] += 1

    # Newsroom samples ("Sample:" titles, a Sample chip on the site): demo builds only, never a deployed catalogue seed.
    if include_demo_users and demo_accounts_enabled():
        from services.newsroom_samples import seed_sample_posts
        created["posts"] = seed_sample_posts(db, now)

    db.commit()
    return created


def _seed_demo_lab(db: Session, now: float) -> tuple[M.Account, dict]:
    """The demo laboratory, its partner account and two collector accounts. Dev seed only. Idempotent."""
    counts = {"accounts": 0, "collectors": 0, "slots": 0}
    owner = db.scalar(select(M.Account).where(M.Account.identifier == DEMO_LAB))
    if owner is None:
        owner = M.Account(id="demo-lab", identifier=DEMO_LAB, channel="EMAIL", full_name=DEMO_LAB_BRAND,
                          role="VENDOR", active=True, profile={}, created_at=now, partner_kind="LAB")
        db.add(owner)
        counts["accounts"] += 1
    if db.get(M.ServiceProvider, DEMO_LAB_PROVIDER_ID) is None:
        # No licence number, no accreditation, never verified: it is a sample.
        db.add(M.ServiceProvider(id=DEMO_LAB_PROVIDER_ID, account_id=owner.id, kind="LAB", legal_name=DEMO_LAB_BRAND,
                                 licence_no="", licence_expiry=0.0, accreditation="", address="Sample address, not a real lab",
                                 pincode="500090", serviceable_pincodes=["500090"], open_hours="Sample hours",
                                 home_collection=True, source_url="", verified_at=0.0, active=True, updated_at=now))
    db.flush()
    for index, (identifier, name) in enumerate(DEMO_COLLECTORS, start=1):
        account = db.scalar(select(M.Account).where(M.Account.identifier == identifier))
        if account is None:
            account = M.Account(id=f"demo-lab-collector-{index}", identifier=identifier, channel="EMAIL",
                                full_name=name, role="LAB_COLLECTOR", active=True, profile={}, created_at=now,
                                partner_kind="")
            db.add(account)
            counts["accounts"] += 1
            db.flush()
        if db.scalar(select(M.LabCollector.id).where(M.LabCollector.account_id == account.id)) is None:
            db.add(M.LabCollector(id=f"demo-collector-{index}", lab_id=DEMO_LAB_PROVIDER_ID, account_id=account.id,
                                  active=True, created_by=owner.id, created_at=now))
            counts["collectors"] += 1
    return owner, counts


def _seed_demo_lab_slots(db: Session, owner: M.Account, now: float) -> int:
    """Collection slots for the next seven days at the demo lab, morning and evening (IST)."""
    from datetime import datetime, timedelta, timezone

    ist = timezone(timedelta(hours=5, minutes=30))
    today = datetime.fromtimestamp(now, ist).date()
    added = 0
    for item_id in DEMO_LAB_PACKAGES:
        item = db.get(M.CatalogEntry, item_id)
        if item is None or item.provider_id != owner.id:
            continue
        for day in range(1, 8):
            date = today + timedelta(days=day)
            for hour in (7, 8, 18):
                slot_id = f"demo-slot-{item_id}-{date.isoformat()}-{hour:02d}"
                if db.get(M.AvailabilitySlot, slot_id) is not None:
                    continue
                start = datetime(date.year, date.month, date.day, hour, 0, tzinfo=ist)
                db.add(M.AvailabilitySlot(id=slot_id, provider_id=owner.id, catalog_item_id=item_id,
                                          slot_start=start.isoformat(), slot_end=(start + timedelta(hours=1)).isoformat(),
                                          capacity=4, booked=0, active=True))
                added += 1
    return added


# The demo doctor's sample consult times (IST): a week ahead, 30 minutes each, one student per slot.
DEMO_CONSULT_HOURS = (10, 11, 16)
DEMO_CONSULT_MINUTES = 30
DEMO_CONSULT_DAYS = 7


def _seed_demo_consult_slots(db: Session, doctor: M.Account, now: float) -> int:
    """Consult slots for the next week on each consultation the demo doctor provides. Dev seed only. Idempotent."""
    from datetime import datetime, timedelta, timezone

    ist = timezone(timedelta(hours=5, minutes=30))
    today = datetime.fromtimestamp(now, ist).date()
    added = 0
    items = db.scalars(select(M.CatalogEntry).where(M.CatalogEntry.kind == "consultation",
                                                    M.CatalogEntry.provider_id == doctor.id)).all()
    for item in items:
        for day in range(1, DEMO_CONSULT_DAYS + 1):
            date = today + timedelta(days=day)
            for hour in DEMO_CONSULT_HOURS:
                slot_id = f"demo-slot-{item.id}-{date.isoformat()}-{hour:02d}"
                if db.get(M.AvailabilitySlot, slot_id) is not None:
                    continue
                start = datetime(date.year, date.month, date.day, hour, 0, tzinfo=ist)
                db.add(M.AvailabilitySlot(id=slot_id, provider_id=doctor.id, catalog_item_id=item.id,
                                          slot_start=start.isoformat(),
                                          slot_end=(start + timedelta(minutes=DEMO_CONSULT_MINUTES)).isoformat(),
                                          capacity=1, booked=0, active=True))
                added += 1
    return added


def seed_catalog_data(db: Session) -> dict:
    """Publish the sample catalog and storefront content to any database.

    Unlike :func:`seed_demo_data` this does not create the demo student or
    administrator accounts, so it is safe to run against a deployed environment
    when a demo storefront is wanted. The provider vendor account is created
    because every catalog entry needs an active provider. Idempotent.
    """
    return seed_demo_data(db, include_demo_users=False)
