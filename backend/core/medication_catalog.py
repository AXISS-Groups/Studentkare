/**
 * Studentkare Medication Module — CDCI Catalog & Monograph Service
 * Compliance: Section M-2.1, M-2.2, M-2.3
 *
 * Deterministically retrieves drug facts by CDCI code.
 * Zero LLM generation for clinical drug properties.
 */

import logging
from typing import Dict, List, Optional, Any
from pydantic import BaseModel

logger = logging.getLogger(__name__)

# Mock canonical CDCI Database Records (SNOMED CT India Extension)
CDCI_DATABASE: Dict[str, Dict[str, Any]] = {
    "CDCI_74820": {
        "cdci_code": "CDCI_74820",
        "brand_name": "Crocin 650",
        "generic_name": "Paracetamol",
        "substance_code": "SUB_PARACETAMOL_500",
        "salt_form": "Paracetamol Acetaminophen",
        "strength": "650 mg",
        "dosage_form": "Tablet",
        "drug_class": "Analgesic & Antipyretic",
        "is_prescription_only": False,
        "mrp_inr": 34.50,
        "plain_description_en": "Paracetamol is commonly used to reduce fever and relieve mild-to-moderate pain such as headaches or body aches.",
        "plain_description_te": "పారసిటమాల్ సాధారణంగా జ్వరం తగ్గించడానికి మరియు మైల్డ్ నొప్పులను తగ్గించడానికి ఉపయోగిస్తారు.",
        "common_side_effects": ["Nausea", "Mild stomach discomfort"],
        "storage_guidance": "Store below 30°C in a dry place away from direct sunlight.",
        "advisor_name": "Dr. R. K. Sharma, MD Internal Medicine",
        "approval_date": "2026-05-10",
        "is_approved": True,
    },
    "CDCI_38190": {
        "cdci_code": "CDCI_38190",
        "brand_name": "Ciplox 500",
        "generic_name": "Ciprofloxacin",
        "substance_code": "SUB_CIPROFLOXACIN",
        "salt_form": "Ciprofloxacin Hydrochloride",
        "strength": "500 mg",
        "dosage_form": "Tablet",
        "drug_class": "Fluoroquinolone Antibiotic",
        "is_prescription_only": True,
        "mrp_inr": 68.00,
        "plain_description_en": "Ciprofloxacin is a broad-spectrum antibiotic used to treat bacterial infections. Must be taken for the full prescribed duration.",
        "plain_description_te": "సిప్రోఫ్లోక్సాసిన్ బ్యాక్టీరియా ఇన్ఫెక్షన్ల నివారణకు ఉపయోగించే యాంటిబయోటిక్.",
        "common_side_effects": ["Diarrhea", "Dizziness", "Stomach upset"],
        "storage_guidance": "Store in a cool dry place below 25°C.",
        "advisor_name": "Dr. S. Nair, MD Clinical Pharmacology",
        "approval_date": "2026-06-15",
        "is_approved": True,
    },
    "CDCI_10482": {
        "cdci_code": "CDCI_10482",
        "brand_name": "Bactrim DS",
        "generic_name": "Trimethoprim / Sulfamethoxazole",
        "substance_code": "SUB_SULFA_COMPOUND",
        "salt_form": "Sulfamethoxazole",
        "strength": "800mg / 160mg",
        "dosage_form": "Tablet",
        "drug_class": "Sulfonamide Antibiotic",
        "is_prescription_only": True,
        "mrp_inr": 42.00,
        "plain_description_en": "Sulfamethoxazole-Trimethoprim is a combination antibiotic used to treat urinary tract and respiratory infections.",
        "plain_description_te": "సల్ఫామెథాక్సాజోల్ యాంటిబయోటిక్ రకం.",
        "common_side_effects": ["Skin rash", "Nausea"],
        "storage_guidance": "Keep out of reach of children. Store below 30°C.",
        "advisor_name": "Dr. R. K. Sharma, MD Internal Medicine",
        "approval_date": "2026-05-12",
        "is_approved": True,
    }
}

# Jan Aushadhi Generic Comparison Table
JAN_AUSHADHI_MAP: Dict[str, Dict[str, Any]] = {
    "SUB_PARACETAMOL_500": {
        "jan_code": "JAN_9012",
        "generic_name": "Paracetamol 650mg Tablets",
        "mrp_inr": 11.20,
        "savings_percentage": 67.5,
    },
    "SUB_CIPROFLOXACIN": {
        "jan_code": "JAN_4410",
        "generic_name": "Ciprofloxacin 500mg Tablets",
        "mrp_inr": 22.00,
        "savings_percentage": 67.6,
    }
}

# CDSCO Recalls Database
CDSCO_RECALLS: Dict[str, Dict[str, Any]] = {
    "BATCH_B9021": {
        "recall_id": "CDSCO_REC_2026_44",
        "brand_name": "Generic Paracetamol",
        "batch_number": "BATCH_B9021",
        "manufacturer": "SamplePharma Ltd",
        "reason": "Sub-standard dissolution rate reported in CDSCO random sample test.",
        "issued_date": "2026-08-01",
    }
}


class MedicationCatalogService:

    @staticmethod
    def lookup_by_cdci_code(cdci_code: str) -> Optional[Dict[str, Any]]:
        record = CDCI_DATABASE.get(cdci_code)
        if not record:
            return None
        if not record.get("is_approved"):
            logger.warning("CDCI code %s requested but monograph lacks medical advisor approval", cdci_code)
            return None
        return record

    @staticmethod
    def get_jan_aushadhi_comparison(substance_code: str, branded_mrp: float) -> Optional[Dict[str, Any]]:
        jan_item = JAN_AUSHADHI_MAP.get(substance_code)
        if not jan_item:
            return None
        return {
            "jan_code": jan_item["jan_code"],
            "generic_name": jan_item["generic_name"],
            "jan_mrp_inr": jan_item["mrp_inr"],
            "branded_mrp_inr": branded_mrp,
            "savings_inr": round(branded_mrp - jan_item["mrp_inr"], 2),
            "savings_percentage": round(((branded_mrp - jan_item["mrp_inr"]) / branded_mrp) * 100, 1),
            "firewall_disclaimer": "Jan Aushadhi is a government public health scheme. Zero commercial commissions or ads.",
        }

    @staticmethod
    def check_cdsco_recall(batch_number: str) -> Optional[Dict[str, Any]]:
        return CDSCO_RECALLS.get(batch_number.strip().upper())
