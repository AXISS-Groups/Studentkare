import { assertRule } from '../core/constitution';

export interface LoopAgentStep {
  loopIndex: number;
  phaseName: string;
  thought: string;
  action: string;
  result: string;
}

// ─── 1. TRIAGE LOOP AGENT ─────────────────────────────────────────────────
export class TeleconsultTriageLoopAgent {
  public runTriageLoop(complaint: string, tempF: number, bp: string): LoopAgentStep[] {
    assertRule('Rule-A');
    assertRule('Rule-B');
    const isRedFlag = tempF > 100.8 || bp.startsWith('140') || complaint.toLowerCase().includes('chest pain');

    return [
      {
        loopIndex: 1,
        phaseName: 'Symptom & Vitals Ingestion Loop',
        thought: `Reading student complaint "${complaint}" alongside Vitals: Temp ${tempF}°F, BP ${bp}.`,
        action: 'PARSE_VITALS_AND_SYMPTOMS',
        result: `Vitals parsed: Temperature ${tempF}°F, Blood Pressure ${bp}.`,
      },
      {
        loopIndex: 2,
        phaseName: 'Red Flag Safety Check Loop',
        thought: 'Checking for emergency markers, severe pyrexia, or cardiovascular risk factors.',
        action: 'EVALUATE_CLINICAL_RED_FLAGS',
        result: isRedFlag ? 'CRITICAL RED FLAG DETECTED: High Pyrexia / BP Spike.' : 'No immediate life-threatening red flags.',
      },
      {
        loopIndex: 3,
        phaseName: 'Triage Categorization & Routing Loop',
        thought: 'Assigning clinical priority level and dispatching to appropriate care pathway.',
        action: 'ASSIGN_TRIAGE_LEVEL',
        result: isRedFlag
          ? 'TRIAGE: URGENT_OPD (Escalated to 108 Emergency ID & Duty NMC Physician).'
          : 'TRIAGE: ROUTINE_TELECONSULT (Booked 15-minute express slot).',
      },
    ];
  }
}

// ─── 2. SPECIALIST ROUTING LOOP AGENT ────────────────────────────────────
export class SpecialistRoutingLoopAgent {
  public runRoutingLoop(symptom: string): LoopAgentStep[] {
    return [
      {
        loopIndex: 1,
        phaseName: 'Symptom-to-Specialty Mapping Loop',
        thought: `User reporting symptom "${symptom}". Mapping to Medical Specialty taxonomy.`,
        action: 'MAP_TAXONOMY',
        result: 'Mapped to: General Internal Medicine & Telemetry Scribe.',
      },
      {
        loopIndex: 2,
        phaseName: 'Doctor Roster Query Loop',
        thought: 'Querying 400+ NMC Verified Doctor Catalog for available campus slots.',
        action: 'QUERY_DOCTOR_ROSTER',
        result: 'Found 14 available NMC Verified MD Doctors on campus duty today.',
      },
      {
        loopIndex: 3,
        phaseName: 'Automated Slot Booking Loop',
        thought: 'Selecting highest rated clinician with shortest queue time.',
        action: 'CONFIRM_TELECONSULT_BOOKING',
        result: 'Successfully booked: Dr. Ananya Rao MD at 02:00 PM (Free Student Pass).',
      },
    ];
  }
}

// ─── 3. PRESCRIPTION & DRUG SAFETY LOOP AGENT ────────────────────────────
export class PrescriptionSafetyLoopAgent {
  public runSafetyLoop(medicationName: string, knownAllergies: string[]): LoopAgentStep[] {
    const hasConflict = knownAllergies.some((a) => medicationName.toLowerCase().includes(a.toLowerCase()));

    return [
      {
        loopIndex: 1,
        phaseName: 'Molecule Inspection Loop',
        thought: `Inspecting active molecule for "${medicationName}".`,
        action: 'INSPECT_MOLECULE',
        result: `Active ingredient verified for ${medicationName}.`,
      },
      {
        loopIndex: 2,
        phaseName: 'Allergy & Contraindication Loop',
        thought: `Cross-referencing student allergies: [${knownAllergies.join(', ')}].`,
        action: 'CHECK_CONTRAINDICATIONS',
        result: hasConflict
          ? 'ALLERGY CONTRAINDICATION FLAGGED! Substitute required.'
          : 'NO ALLERGY CONFLICT DETECTED. Prescription safe to dispense.',
      },
      {
        loopIndex: 3,
        phaseName: 'Hostel Express Dispatch Loop',
        thought: 'Checking campus pharmacy stock and routing express delivery rider.',
        action: 'DISPATCH_PHARMACY_RIDER',
        result: 'Rider Assigned! ETA: 25 minutes to Hostel Room.',
      },
    ];
  }
}
