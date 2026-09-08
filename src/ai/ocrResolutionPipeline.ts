/**
 * Studentkare — On-Device OCR & Text Resolution Pipeline (M-3.1 to M-3.3)
 * Compliance: Medication Information Specification
 *
 * Rules:
 * 1. OCR runs on-device (ML Kit / client-side). No cloud vision API uploads.
 * 2. LLM only maps messy OCR text to candidate string. Never generates drug facts.
 * 3. Confidence handling:
 *    - High confidence single match -> Return CDCI code.
 *    - Ambiguous multi-match -> Return candidate list (never auto-select).
 *    - Low confidence -> "I couldn't read this clearly enough to be sure."
 */

export interface CDCIIndexItem {
  cdciCode: string;
  brandName: string;
  genericName: string;
  substanceCode: string;
  strength: string;
  dosageForm: string;
}

export const KNOWN_CDCI_INDEX: CDCIIndexItem[] = [
  { cdciCode: 'CDCI_74820', brandName: 'Crocin 650', genericName: 'Paracetamol', substanceCode: 'SUB_PARACETAMOL_500', strength: '650 mg', dosageForm: 'Tablet' },
  { cdciCode: 'CDCI_38190', brandName: 'Ciplox 500', genericName: 'Ciprofloxacin', substanceCode: 'SUB_CIPROFLOXACIN', strength: '500 mg', dosageForm: 'Tablet' },
  { cdciCode: 'CDCI_10482', brandName: 'Bactrim DS', genericName: 'Trimethoprim / Sulfamethoxazole', substanceCode: 'SUB_SULFA_COMPOUND', strength: '800mg / 160mg', dosageForm: 'Tablet' },
];

export interface OCRResolutionResult {
  status: 'RESOLVED_SINGLE' | 'AMBIGUOUS_MULTI' | 'LOW_CONFIDENCE_UNRESOLVED';
  matchedCode?: string;
  candidates?: CDCIIndexItem[];
  confidenceScore: number; // 0.0 to 1.0
  message: string;
}

export function normalizeOCRText(rawText: string): string {
  return rawText
    .trim()
    .toUpperCase()
    .replace(/65O/g, '650') // Common OCR confusion: O -> 0
    .replace(/5OO/g, '500')
    .replace(/1MG/g, '1 MG')
    .replace(/\s+/g, ' ');
}

export function resolveOCRTextToCDCI(rawText: string): OCRResolutionResult {
  const normalized = normalizeOCRText(rawText);

  if (!normalized || normalized.length < 3) {
    return {
      status: 'LOW_CONFIDENCE_UNRESOLVED',
      confidenceScore: 0.0,
      message: "I couldn't read this clearly enough to be sure. Please type the medicine name manually.",
    };
  }

  // Exact or high fuzzy matching against candidate index
  const candidates = KNOWN_CDCI_INDEX.filter((item) => {
    const bName = item.brandName.toUpperCase();
    const gName = item.genericName.toUpperCase();
    return normalized.includes(bName) || bName.includes(normalized) || normalized.includes(gName);
  });

  if (candidates.length === 1) {
    return {
      status: 'RESOLVED_SINGLE',
      matchedCode: candidates[0].cdciCode,
      candidates,
      confidenceScore: 0.95,
      message: `Matched ${candidates[0].brandName} (${candidates[0].cdciCode}).`,
    };
  }

  if (candidates.length > 1) {
    return {
      status: 'AMBIGUOUS_MULTI',
      candidates,
      confidenceScore: 0.6,
      message: `Multiple plausible matches found (${candidates.length}). Please select your medicine from the list.`,
    };
  }

  return {
    status: 'LOW_CONFIDENCE_UNRESOLVED',
    confidenceScore: 0.2,
    message: "I couldn't read this clearly enough to be sure. Please type the medicine name manually.",
  };
}
