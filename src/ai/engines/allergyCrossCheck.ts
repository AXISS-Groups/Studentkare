/**
 * Studentkare — Deterministic Allergy Cross-Check Module (M-4.3)
 * Compliance: Section M-4.3 Specification
 *
 * Rules:
 * 1. Deterministic substance and salt-form matching (NOT an LLM).
 * 2. Phrased as a FACTUAL FLAG, not clinical advice:
 *    "This contains [Substance]. Your record lists a [Substance] allergy. Do not take this without asking a doctor."
 * 3. Never claims safety when no match is found. UI renders nothing if clear.
 */

export interface StudentAllergyRecord {
  substanceCode: string;
  allergyName: string;
}

export interface AllergyCrossCheckResult {
  hasConflict: boolean;
  conflictingSubstance?: string;
  warningFlagText?: string;
}

// Substance cross-reactivity mapping (e.g. Sulfa compounds)
const CROSS_REACTIVITY_MAP: Record<string, string[]> = {
  SUB_SULFA_COMPOUND: ['SUB_SULFA_COMPOUND', 'SULFA', 'SULFAMETHOXAZOLE', 'SULFONAMIDE'],
  SUB_PENICILLIN: ['SUB_PENICILLIN', 'PENICILLIN', 'AMOXICILLIN', 'AMPICILLIN'],
  SUB_CIPROFLOXACIN: ['SUB_CIPROFLOXACIN', 'CIPROFLOXACIN', 'FLUOROQUINOLONE'],
};

export function performAllergyCrossCheck(
  targetSubstanceCode: string,
  targetGenericName: string,
  studentAllergies: StudentAllergyRecord[]
): AllergyCrossCheckResult {
  if (!studentAllergies || studentAllergies.length === 0) {
    return { hasConflict: false };
  }

  const crossReactivityList = CROSS_REACTIVITY_MAP[targetSubstanceCode] || [targetSubstanceCode];

  for (const allergy of studentAllergies) {
    const allergyCodeUpper = allergy.substanceCode.toUpperCase();
    const allergyNameUpper = allergy.allergyName.toUpperCase();
    const targetNameUpper = targetGenericName.toUpperCase();

    const isDirectMatch =
      crossReactivityList.includes(allergyCodeUpper) ||
      targetNameUpper.includes(allergyNameUpper) ||
      allergyNameUpper.includes(targetNameUpper);

    if (isDirectMatch) {
      return {
        hasConflict: true,
        conflictingSubstance: allergy.allergyName,
        warningFlagText: `This contains ${allergy.allergyName}. Your record lists a ${allergy.allergyName} allergy. Do not take this without asking a doctor.`,
      };
    }
  }

  return { hasConflict: false };
}
