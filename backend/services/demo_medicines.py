"""DEMO medicine master rows for the development seed only (services/demo_seed.py).

Thirty common medicines with realistic compositions, dosage forms and Indian
drug schedules, so salt search and same-composition alternatives have
something to work on locally. Several share a composition on purpose.

Everything here is sample data:
* brand names and manufacturers are invented ("Sample Pharma … (demo)");
* prices are illustrative and are never presented as real;
* schedules follow common Indian practice but are not a regulatory source —
  a real deployment loads its master from a verified source, through the
  super-admin endpoints, never from this file.

Nothing in a production path imports this module except the dev seed, which
refuses to run outside development and testing.
"""
from __future__ import annotations

DEMO_MEDICINE_NOTE = ("Sample development entry. Invented brand and illustrative price for local testing; "
                      "not a real product or medical advice.")

_PARA = [("Paracetamol", 500, "mg")]
_PARA_650 = [("Paracetamol", 650, "mg")]
_CETIRIZINE = [("Cetirizine Hydrochloride", 10, "mg")]
_ORS = [("Sodium Chloride", 2.6, "g"), ("Potassium Chloride", 1.5, "g"), ("Sodium Citrate", 2.9, "g"),
        ("Dextrose Anhydrous", 13.5, "g")]
_ANTACID = [("Aluminium Hydroxide", 250, "mg"), ("Magnesium Hydroxide", 250, "mg"), ("Simethicone", 50, "mg")]
_POVIDONE = [("Povidone-Iodine", 5, "% w/w")]
_CLOTRIMAZOLE = [("Clotrimazole", 1, "% w/w")]
_VITAMIN_C = [("Ascorbic Acid", 500, "mg")]
_AZITHROMYCIN = [("Azithromycin", 500, "mg")]
_AMOX_CLAV = [("Amoxicillin", 500, "mg"), ("Clavulanic Acid", 125, "mg")]
_PANTOPRAZOLE = [("Pantoprazole", 40, "mg")]

# (id, name, ingredients, dosage form, pack, manufacturer, schedule, price paise, mrp paise)
DEMO_MEDICINES: list[tuple[str, str, list[tuple[str, float, str]], str, str, str, str, int, int]] = [
    # --- OTC ---
    ("demo-med-pyrexa-500", "Pyrexa 500", _PARA, "TABLET", "Strip of 15 tablets", "Sample Pharma A (demo)", "OTC", 2900, 3400),
    ("demo-med-feverin-500", "Feverin 500", _PARA, "TABLET", "Strip of 15 tablets", "Sample Pharma B (demo)", "OTC", 2200, 2600),
    ("demo-med-calmol-500", "Calmol 500", _PARA, "TABLET", "Strip of 10 tablets", "Sample Pharma C (demo)", "OTC", 1500, 1800),
    ("demo-med-pyrexa-650", "Pyrexa 650", _PARA_650, "TABLET", "Strip of 15 tablets", "Sample Pharma A (demo)", "OTC", 3300, 3800),
    ("demo-med-temprol-650", "Temprol 650", _PARA_650, "TABLET", "Strip of 15 tablets", "Sample Pharma D (demo)", "OTC", 2800, 3200),
    ("demo-med-pyrexa-syrup", "Pyrexa Syrup", [("Paracetamol", 125, "mg/5ml")], "SYRUP", "Bottle of 60 ml", "Sample Pharma A (demo)", "OTC", 4100, 4600),
    ("demo-med-allerfree-10", "Allerfree 10", _CETIRIZINE, "TABLET", "Strip of 10 tablets", "Sample Pharma B (demo)", "OTC", 1900, 2200),
    ("demo-med-sneezol-10", "Sneezol 10", _CETIRIZINE, "TABLET", "Strip of 10 tablets", "Sample Pharma E (demo)", "OTC", 1600, 1900),
    ("demo-med-hydrasol-ors", "Hydrasol ORS", _ORS, "SACHET", "Box of 10 sachets of 21 g", "Sample Pharma C (demo)", "OTC", 2000, 2300),
    ("demo-med-rehydra-ors", "Rehydra ORS", _ORS, "SACHET", "Box of 10 sachets of 21 g", "Sample Pharma F (demo)", "OTC", 2400, 2800),
    ("demo-med-gastrolin", "Gastrolin Chewable", _ANTACID, "TABLET", "Strip of 15 chewable tablets", "Sample Pharma D (demo)", "OTC", 3000, 3500),
    ("demo-med-acidease", "Acidease Chewable", _ANTACID, "TABLET", "Strip of 15 chewable tablets", "Sample Pharma E (demo)", "OTC", 2600, 3000),
    ("demo-med-woundkare", "Woundkare 5%", _POVIDONE, "OINTMENT", "Tube of 15 g", "Sample Pharma B (demo)", "OTC", 6500, 7500),
    ("demo-med-iodisept", "Iodisept", _POVIDONE, "OINTMENT", "Tube of 15 g", "Sample Pharma F (demo)", "OTC", 5800, 6600),
    ("demo-med-fungowell", "Fungowell Cream", _CLOTRIMAZOLE, "CREAM", "Tube of 15 g", "Sample Pharma C (demo)", "OTC", 7200, 8200),
    ("demo-med-clozem", "Clozem Cream", _CLOTRIMAZOLE, "CREAM", "Tube of 15 g", "Sample Pharma A (demo)", "OTC", 6100, 7000),
    ("demo-med-citrovit-500", "Citrovit 500", _VITAMIN_C, "TABLET", "Strip of 15 chewable tablets", "Sample Pharma D (demo)", "OTC", 3100, 3600),
    ("demo-med-cguard-500", "C-Guard 500", _VITAMIN_C, "TABLET", "Strip of 15 chewable tablets", "Sample Pharma E (demo)", "OTC", 2700, 3100),
    # --- prescription schedules ---
    ("demo-med-azimax-500", "Azimax 500", _AZITHROMYCIN, "TABLET", "Strip of 3 tablets", "Sample Pharma A (demo)", "H", 11800, 13200),
    ("demo-med-zithrocare-500", "Zithrocare 500", _AZITHROMYCIN, "TABLET", "Strip of 3 tablets", "Sample Pharma C (demo)", "H", 9500, 10800),
    ("demo-med-amoxikare-500", "Amoxikare 500", [("Amoxicillin", 500, "mg")], "CAPSULE", "Strip of 10 capsules", "Sample Pharma B (demo)", "H", 8400, 9600),
    ("demo-med-clavokare-625", "Clavokare 625", _AMOX_CLAV, "TABLET", "Strip of 10 tablets", "Sample Pharma D (demo)", "H", 19800, 22400),
    ("demo-med-augmenta-625", "Augmenta 625", _AMOX_CLAV, "TABLET", "Strip of 10 tablets", "Sample Pharma F (demo)", "H", 17500, 20100),
    ("demo-med-pantokare-40", "Pantokare 40", _PANTOPRAZOLE, "TABLET", "Strip of 15 tablets", "Sample Pharma A (demo)", "H", 12500, 14200),
    ("demo-med-acipan-40", "Acipan 40", _PANTOPRAZOLE, "TABLET", "Strip of 15 tablets", "Sample Pharma E (demo)", "H", 9900, 11500),
    ("demo-med-ciprokare-500", "Ciprokare 500", [("Ciprofloxacin", 500, "mg")], "TABLET", "Strip of 10 tablets", "Sample Pharma B (demo)", "H", 6800, 7800),
    ("demo-med-ibukare-400", "Ibukare 400", [("Ibuprofen", 400, "mg")], "TABLET", "Strip of 15 tablets", "Sample Pharma C (demo)", "H", 2500, 2900),
    ("demo-med-montikare-lc", "Montikare LC", [("Montelukast", 10, "mg"), ("Levocetirizine", 5, "mg")], "TABLET", "Strip of 10 tablets", "Sample Pharma D (demo)", "H", 16500, 18900),
    ("demo-med-breathkare", "Breathkare Inhaler", [("Salbutamol", 100, "mcg/dose")], "INHALER", "Inhaler of 200 doses", "Sample Pharma F (demo)", "H", 14500, 16200),
    ("demo-med-cefikare-200", "Cefikare 200", [("Cefixime", 200, "mg")], "TABLET", "Strip of 10 tablets", "Sample Pharma E (demo)", "H1", 10900, 12400),
]


def demo_medicine_listings() -> list[dict]:
    """One sample shop listing per demo medicine, in DEMO_CATALOG's shape."""
    return [
        {"id": f"{medicine_id}-listing", "kind": "product", "name": name, "brand": manufacturer.split(" (")[0],
         "category": "medicines", "pack": pack, "price_paise": price, "mrp_paise": mrp, "stock": 40,
         "description": DEMO_MEDICINE_NOTE, "requires_prescription": schedule != "OTC", "medicine_id": medicine_id}
        for medicine_id, name, _ingredients, _form, pack, manufacturer, schedule, price, mrp in DEMO_MEDICINES
    ]
