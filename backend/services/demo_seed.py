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
DEMO_DOCTOR = "demo.doctor@studentkare.test"
DEMO_CAMPUS = "demo.campus@studentkare.test"

DEMO_STUDENT_PHONE = "9876543210"
DEMO_ADMIN_PHONE = "9876543211"
DEMO_VENDOR_PHONE = "9876543212"
DEMO_DOCTOR_PHONE = "9876543213"
DEMO_CAMPUS_PHONE = "9876543214"

SAMPLE_NOTE = "Sample development entry. Illustrative listing for local testing; not a real product, service, or medical advice."

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
        {"id": "demo-full-body", "kind": "lab", "name": "Complete Health Checkup", "brand": "Kare Labs", "category": "labs", "pack": "Includes 72 parameters", "price_paise": 149900, "mrp_paise": 299900, "stock": 0, "description": f"{SAMPLE_NOTE} Preventive-health package concept.", "preparation": "Sample preparation note: confirm fasting and collection with a real lab."},
        {"id": "demo-vitamin-panel", "kind": "lab", "name": "Vitamin D & B12 Check", "brand": "Kare Labs", "category": "labs", "pack": "Includes 2 parameters", "price_paise": 89900, "mrp_paise": 159900, "stock": 0, "description": f"{SAMPLE_NOTE} Vitamin measurement concept."},
        {"id": "demo-thyroid", "kind": "lab", "name": "Thyroid Profile", "brand": "Kare Labs", "category": "labs", "pack": "Includes 3 parameters", "price_paise": 39900, "mrp_paise": 69900, "stock": 0, "description": f"{SAMPLE_NOTE} Thyroid profile concept. Select tests with clinical advice."},
        {"id": "demo-diabetes-panel", "kind": "lab", "name": "Diabetes Care Checkup", "brand": "Kare Labs", "category": "labs", "pack": "Includes 8 parameters", "price_paise": 59900, "mrp_paise": 99900, "stock": 0, "description": f"{SAMPLE_NOTE} Blood-sugar checkup concept."},
        {"id": "demo-iron-panel", "kind": "lab", "name": "Anemia & Iron Deficiency Panel", "brand": "Kare Labs", "category": "labs", "pack": "Includes 4 parameters", "price_paise": 69900, "mrp_paise": 119900, "stock": 0, "description": f"{SAMPLE_NOTE} Ferritin and serum iron checkup concept."},
        {"id": "demo-allergy-screen", "kind": "lab", "name": "Food & Dust Allergy Screen", "brand": "Kare Labs", "category": "labs", "pack": "Includes 24 IgE parameters", "price_paise": 129900, "mrp_paise": 219900, "stock": 0, "description": f"{SAMPLE_NOTE} Common allergen screening concept."},
        {"id": "demo-lipid-profile", "kind": "lab", "name": "Lipid Profile & Cardiac Screening", "brand": "Kare Labs", "category": "labs", "pack": "Includes 6 parameters", "price_paise": 49900, "mrp_paise": 89900, "stock": 0, "description": f"{SAMPLE_NOTE} Cholesterol and triglyceride assessment concept."},
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
        {"id": "demo-fever-panel", "kind": "lab", "name": "Fever Panel (Dengue, Malaria, Typhoid)", "brand": "Kare Labs", "category": "labs", "pack": "Includes 12 parameters", "price_paise": 99900, "mrp_paise": 159900, "stock": 0, "description": f"{SAMPLE_NOTE} Fever investigation package concept. High or worsening fever needs prompt clinical care.", "preparation": "Sample preparation: no fasting usually required. Confirm with the actual lab."},
        {"id": "demo-lft", "kind": "lab", "name": "Liver Function Test (LFT)", "brand": "Kare Labs", "category": "labs", "pack": "Includes 11 parameters", "price_paise": 44900, "mrp_paise": 69900, "stock": 0, "description": f"{SAMPLE_NOTE} Liver panel concept covering common liver markers.", "preparation": "Sample preparation: fasting may be advised. Confirm with the actual lab."},
        {"id": "demo-kft", "kind": "lab", "name": "Kidney Function Test (KFT)", "brand": "Kare Labs", "category": "labs", "pack": "Includes 8 parameters", "price_paise": 49900, "mrp_paise": 79900, "stock": 0, "description": f"{SAMPLE_NOTE} Kidney panel concept covering common renal markers.", "preparation": "Sample preparation: hydration advice varies. Confirm with the actual lab."},
        {"id": "demo-cbc", "kind": "lab", "name": "Complete Blood Count (CBC)", "brand": "Kare Labs", "category": "labs", "pack": "Includes 21 parameters", "price_paise": 31900, "mrp_paise": 49900, "stock": 0, "description": f"{SAMPLE_NOTE} Complete blood count concept covering common cell indices.", "preparation": "Sample preparation: no fasting usually required. Confirm with the actual lab."},
        {"id": "demo-vitb12", "kind": "lab", "name": "Vitamin B12 & Folate Check", "brand": "Kare Labs", "category": "labs", "pack": "Includes 2 parameters", "price_paise": 74900, "mrp_paise": 119900, "stock": 0, "description": f"{SAMPLE_NOTE} Vitamin B12 and folate measurement concept.", "preparation": "Sample preparation: no fasting usually required. Confirm with the actual lab."},
    ]


def seed_demo_data(db: Session, include_demo_users: bool = True) -> dict:
    """Create demo accounts and the sample catalog. Idempotent: skips existing rows.

    When ``include_demo_users`` is False, only the vendor provider account and the
    catalog/storefront content are written (no student or administrator accounts),
    which is what ``seed_catalog_data`` uses to populate a deployed environment.
    """
    now = time.time()
    created = {"accounts": 0, "catalog": 0, "content": 0, "articles": 0}

    accounts = [
        (DEMO_STUDENT, "Demo Student", "STUDENT", "EMAIL", {"dob": "2000-01-01", "university": "Demo University", "rollNumber": "DEMO-001", "bloodGroup": "O+", "ageVerified": False, "isVerifiedStudent": False}),
        (DEMO_ADMIN, "Demo Administrator", "SUPER_ADMIN", "EMAIL", {}),
        (DEMO_VENDOR, "Demo Wellness Store", "VENDOR", "EMAIL", {}),
        (DEMO_DOCTOR, "Demo Clinician", "NMC_DOCTOR", "EMAIL", {}),
        (DEMO_CAMPUS, "Demo Campus Admin", "CAMPUS_ADMIN", "EMAIL", {}),
        (DEMO_STUDENT_PHONE, "Demo Student (Mobile)", "STUDENT", "WHATSAPP", {"dob": "2000-01-01", "university": "Demo University", "rollNumber": "DEMO-002", "bloodGroup": "O+", "ageVerified": False, "isVerifiedStudent": False}),
        (DEMO_ADMIN_PHONE, "Demo Administrator (Mobile)", "SUPER_ADMIN", "WHATSAPP", {}),
        (DEMO_VENDOR_PHONE, "Demo Wellness Store (Mobile)", "VENDOR", "WHATSAPP", {}),
        (DEMO_DOCTOR_PHONE, "Demo Clinician (Mobile)", "NMC_DOCTOR", "WHATSAPP", {}),
        (DEMO_CAMPUS_PHONE, "Demo Campus Admin (Mobile)", "CAMPUS_ADMIN", "WHATSAPP", {}),
    ]
    vendor = None
    for identifier, name, role, channel, profile in accounts:
        if not include_demo_users and identifier != DEMO_VENDOR:
            continue
        existing = db.scalar(select(M.Account).where(M.Account.identifier == identifier))
        if existing is None:
            acc_id = f"demo-{role.lower()}" if channel == "EMAIL" else f"demo-{role.lower()}-phone"
            vendor_candidate = M.Account(id=acc_id, identifier=identifier, channel=channel,
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
                                  pack=entry["pack"], price_paise=entry["price_paise"], mrp_paise=entry.get("mrp_paise", 0), stock=entry["stock"],
                                  active=True, requires_prescription=entry.get("requires_prescription", False),
                                  preparation=entry.get("preparation", "")))
            created["catalog"] += 1

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

    db.commit()
    return created


def seed_catalog_data(db: Session) -> dict:
    """Publish the sample catalog and storefront content to any database.

    Unlike :func:`seed_demo_data` this does not create the demo student or
    administrator accounts, so it is safe to run against a deployed environment
    when a demo storefront is wanted. The provider vendor account is created
    because every catalog entry needs an active provider. Idempotent.
    """
    return seed_demo_data(db, include_demo_users=False)
