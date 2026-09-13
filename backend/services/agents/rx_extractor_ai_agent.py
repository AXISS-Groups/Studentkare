"""
services.agents.rx_extractor_ai_agent — Honest prescription text extraction.

Matches medication names that actually appear in the supplied prescription text and
returns source-linked matches with explicit 'unknown' fields. It never invents a
doctor, date, dosage, or frequency, and never returns an unrelated default item
when nothing matches.
"""
from __future__ import annotations

import re
from typing import Any, Dict, List

from pydantic import BaseModel


class ExtractedMedicine(BaseModel):
    matched_catalog_id: str
    matched_catalog_name: str
    dosage: str = "unknown"
    frequency: str = "unknown"
    needs_review: bool = True
    source_span: str = ""


class PrescriptionAnalysisResult(BaseModel):
    prescription_id: str
    detected_doctor: str = "unknown"
    detected_date: str = "unknown"
    extracted_items: List[ExtractedMedicine]
    total_items_count: int
    ai_summary: str


class RxExtractorAIAgent:
    agent_name = "Prescription AI Extractor Agent"
    version = "1.1.0"

    def analyze_prescription_text(self, text: str, catalog_items: List[Dict[str, Any]]) -> PrescriptionAnalysisResult:
        """Extract only medications that genuinely appear in the text."""
        text_lower = text.lower()
        extracted: List[ExtractedMedicine] = []

        # Doctor heuristic: only record if a plausible "Dr <name>" is present.
        doctor_match = re.search(r"dr\.?\s+([a-z]+(?:\s+[a-z]+){0,2})", text, re.IGNORECASE)
        detected_doctor = doctor_match.group(1).strip().title() if doctor_match else "unknown"

        # Date heuristic: only record if a plausible date is present.
        date_match = re.search(r"(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})", text)
        detected_date = date_match.group(1) if date_match else "unknown"

        for item in catalog_items:
            name = item.get("name", "")
            name_words = [w.lower() for w in name.split() if len(w) > 3]
            if not name_words:
                continue
            matched = any(w in text_lower for w in name_words)
            if matched:
                # Capture the occurrence as provenance.
                idx = text_lower.find(next(w for w in name_words if w in text_lower))
                span = text[max(0, idx - 20): idx + len(name) + 20].replace("\n", " ")
                extracted.append(ExtractedMedicine(
                    matched_catalog_id=item.get("id", ""),
                    matched_catalog_name=name,
                    needs_review=True,
                    source_span=span,
                ))

        summary = (
            f"Matched {len(extracted)} catalog item(s) found in the text. "
            f"Dosage, frequency, and validity are marked unknown and require review."
        )
        return PrescriptionAnalysisResult(
            prescription_id=f"rx_{abs(hash(text)) % 100000}",
            detected_doctor=detected_doctor,
            detected_date=detected_date,
            extracted_items=extracted,
            total_items_count=len(extracted),
            ai_summary=summary,
        )


rx_extractor_ai_agent = RxExtractorAIAgent()
