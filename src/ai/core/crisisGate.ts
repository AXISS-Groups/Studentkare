/**
 * Studentkare — Crisis Gate Evaluator (M-5.1 / G0.1)
 * Detects self-harm, medical emergency, overdose/toxicity, and acute psychological distress.
 *
 * Non-negotiable Rules:
 * 1. Fails closed: All exceptions, timeouts (>1500 ms), or classifier errors evaluate to status: "error" (isCrisis: true).
 * 2. Deterministic floor: Exact phrase match executes first. An ML classifier may ONLY escalate, NEVER demote a crisis flag.
 * 3. Overdose/toxicity queries MUST NEVER return lethal dose or toxicity threshold details.
 * 4. Resource Card Links: Tele-MANAS (14416 & 1-800-891-4416), 112 Emergency Services, Campus Counsellor.
 */

export type CrisisGateStatus = 'crisis' | 'clear' | 'error';

export type CrisisKind =
  | 'CRISIS_SELF_HARM'
  | 'CRISIS_MEDICAL'
  | 'CRISIS_OVERDOSE'
  | 'ERROR_FAIL_CLOSED'
  | 'CLEAR';

export interface CrisisGateResult {
  status: CrisisGateStatus;
  isCrisis: boolean;
  kind: CrisisKind;
  message: string;
  teleManasPrimary: string;
  teleManasTollFree: string;
  emergencyNumber: string;
  counsellorContact: string;
}

export const TELE_MANAS_PRIMARY = '14416';
export const TELE_MANAS_TOLL_FREE = '1-800-891-4416';
export const EMERGENCY_NUMBER = '112';
export const DEFAULT_CAMPUS_COUNSELLOR = '1800-599-0019';

// TODO(clinical-review): Advisor-reviewed phrase list floor table (English, Hindi, Telugu, Hinglish)
export const CRISIS_PHRASE_MAPPINGS: Array<{
  pattern: RegExp;
  kind: 'CRISIS_SELF_HARM' | 'CRISIS_OVERDOSE' | 'CRISIS_MEDICAL';
  language: 'EN' | 'HI' | 'TE' | 'HINGLISH';
}> = [
  // --- English Self-Harm & Suicidal Intent ---
  { pattern: /end\s+(my\s+)?life/i, kind: 'CRISIS_SELF_HARM', language: 'EN' },
  { pattern: /end\s+it\s+all/i, kind: 'CRISIS_SELF_HARM', language: 'EN' },
  { pattern: /kill\s+my\s*self/i, kind: 'CRISIS_SELF_HARM', language: 'EN' },
  { pattern: /kil\s+my\s*self/i, kind: 'CRISIS_SELF_HARM', language: 'EN' },
  { pattern: /suicid(e|al)/i, kind: 'CRISIS_SELF_HARM', language: 'EN' },
  { pattern: /sucidal/i, kind: 'CRISIS_SELF_HARM', language: 'EN' },
  { pattern: /self\s*harm/i, kind: 'CRISIS_SELF_HARM', language: 'EN' },
  { pattern: /cut(ting)?\s+(my\s+)?wrist/i, kind: 'CRISIS_SELF_HARM', language: 'EN' },
  { pattern: /exit\s+from\s+this\s+world/i, kind: 'CRISIS_SELF_HARM', language: 'EN' },
  { pattern: /can['’]?t\s+take\s+it\s+any\s*more/i, kind: 'CRISIS_SELF_HARM', language: 'EN' },
  { pattern: /want\s+to\s+die/i, kind: 'CRISIS_SELF_HARM', language: 'EN' },

  // --- Hindi Crisis Phrases TODO(clinical-review) ---
  { pattern: /जान\s+लेना/i, kind: 'CRISIS_SELF_HARM', language: 'HI' },
  { pattern: /आत्महत्या/i, kind: 'CRISIS_SELF_HARM', language: 'HI' },
  { pattern: /खुद\s+को\s+मार/i, kind: 'CRISIS_SELF_HARM', language: 'HI' },
  { pattern: /मरना\s+चाहता/i, kind: 'CRISIS_SELF_HARM', language: 'HI' },

  // --- Telugu Crisis Phrases TODO(clinical-review) ---
  { pattern: /చనిపోవాలని/i, kind: 'CRISIS_SELF_HARM', language: 'TE' },
  { pattern: /ఆత్మహత్య/i, kind: 'CRISIS_SELF_HARM', language: 'TE' },
  { pattern: /చనిపోతాను/i, kind: 'CRISIS_SELF_HARM', language: 'TE' },

  // --- Hinglish Crisis Phrases TODO(clinical-review) ---
  { pattern: /marne\s+ka\s+man/i, kind: 'CRISIS_SELF_HARM', language: 'HINGLISH' },
  { pattern: /ji\s+sakta/i, kind: 'CRISIS_SELF_HARM', language: 'HINGLISH' },
  { pattern: /chani\s*povali/i, kind: 'CRISIS_SELF_HARM', language: 'HINGLISH' },
  { pattern: /cheskuntanu/i, kind: 'CRISIS_SELF_HARM', language: 'HINGLISH' },
  { pattern: /suicide\s+kar\s+dunga/i, kind: 'CRISIS_SELF_HARM', language: 'HINGLISH' },
  { pattern: /jeena\s+nahi\s+hai/i, kind: 'CRISIS_SELF_HARM', language: 'HINGLISH' },

  // --- Overdose / Toxicity Intent Queries ---
  { pattern: /how\s+many\s+pills\s+to\s+die/i, kind: 'CRISIS_OVERDOSE', language: 'EN' },
  { pattern: /lethal\s+dose/i, kind: 'CRISIS_OVERDOSE', language: 'EN' },
  { pattern: /overdose/i, kind: 'CRISIS_OVERDOSE', language: 'EN' },
  { pattern: /how\s+much\s+is\s+too\s+much/i, kind: 'CRISIS_OVERDOSE', language: 'EN' },
  { pattern: /maximum\s+dose\s+to\s+pass\s+out/i, kind: 'CRISIS_OVERDOSE', language: 'EN' },
  { pattern: /toxic\s+limit/i, kind: 'CRISIS_OVERDOSE', language: 'EN' },
  { pattern: /how\s+many\s+crocin\s+to\s+kill/i, kind: 'CRISIS_OVERDOSE', language: 'EN' },

  // --- Medical Emergency Signals ---
  { pattern: /chest\s+pain/i, kind: 'CRISIS_MEDICAL', language: 'EN' },
  { pattern: /can(not|'t)\s+breathe/i, kind: 'CRISIS_MEDICAL', language: 'EN' },
  { pattern: /bleeding\s+heavily/i, kind: 'CRISIS_MEDICAL', language: 'EN' },
  { pattern: /swelling\s+throat/i, kind: 'CRISIS_MEDICAL', language: 'EN' },
  { pattern: /unresponsive/i, kind: 'CRISIS_MEDICAL', language: 'EN' },
  { pattern: /seizure/i, kind: 'CRISIS_MEDICAL', language: 'EN' },
  { pattern: /anaphylaxis/i, kind: 'CRISIS_MEDICAL', language: 'EN' },
];

export const CLEAR_HYPERBOLE_PATTERNS = [
  /dying\s+of\s+boredom/i,
  /assignment\s+is\s+killing\s+me/i,
  /murder\s+a\s+biryani/i,
  /dead\s+tired/i,
  /battery\s+died/i,
];

function buildFailClosedResult(reason: string, studentName: string = 'Student'): CrisisGateResult {
  return {
    status: 'error',
    isCrisis: true,
    kind: 'ERROR_FAIL_CLOSED',
    message: `${studentName}, emergency services and support channels are immediately available. If you or someone else needs help, please connect with Tele-MANAS (${TELE_MANAS_PRIMARY} / ${TELE_MANAS_TOLL_FREE}), Emergency Services (${EMERGENCY_NUMBER}), or Campus Counsellor (${DEFAULT_CAMPUS_COUNSELLOR}). (${reason})`,
    teleManasPrimary: TELE_MANAS_PRIMARY,
    teleManasTollFree: TELE_MANAS_TOLL_FREE,
    emergencyNumber: EMERGENCY_NUMBER,
    counsellorContact: DEFAULT_CAMPUS_COUNSELLOR,
  };
}

/**
 * Pure deterministic floor evaluation.
 * Returns CrisisGateResult with status: "crisis" | "clear" | "error".
 */
export function evaluateCrisisGate(input: string, studentName: string = 'Student'): CrisisGateResult {
  try {
    if (typeof input !== 'string') {
      return buildFailClosedResult('Invalid input type', studentName);
    }

    const normalized = input.trim().toLowerCase();
    if (!normalized) {
      return {
        status: 'clear',
        isCrisis: false,
        kind: 'CLEAR',
        message: 'Clear input',
        teleManasPrimary: TELE_MANAS_PRIMARY,
        teleManasTollFree: TELE_MANAS_TOLL_FREE,
        emergencyNumber: EMERGENCY_NUMBER,
        counsellorContact: DEFAULT_CAMPUS_COUNSELLOR,
      };
    }

    // 1. Check hyperbole allowlist (only if no explicit crisis phrase is matched)
    let isHyperbole = false;
    for (const pattern of CLEAR_HYPERBOLE_PATTERNS) {
      if (pattern.test(normalized)) {
        isHyperbole = true;
        break;
      }
    }

    // 2. Table-driven phrase matching (deterministic floor)
    for (const entry of CRISIS_PHRASE_MAPPINGS) {
      if (entry.pattern.test(normalized)) {
        if (entry.kind === 'CRISIS_OVERDOSE') {
          return {
            status: 'crisis',
            isCrisis: true,
            kind: 'CRISIS_OVERDOSE',
            message: `${studentName}, if you or someone you know has taken medication in dangerous quantities or is in danger of an overdose, seek immediate emergency care. Contact National Poison Helpline (1800-116-117), Tele-MANAS (${TELE_MANAS_PRIMARY}), or Emergency Services (${EMERGENCY_NUMBER}).`,
            teleManasPrimary: TELE_MANAS_PRIMARY,
            teleManasTollFree: TELE_MANAS_TOLL_FREE,
            emergencyNumber: EMERGENCY_NUMBER,
            counsellorContact: DEFAULT_CAMPUS_COUNSELLOR,
          };
        }

        if (entry.kind === 'CRISIS_SELF_HARM') {
          return {
            status: 'crisis',
            isCrisis: true,
            kind: 'CRISIS_SELF_HARM',
            message: `${studentName}, I hear that you are going through a very painful time. You are not alone. Please talk to someone right now who can support you. Tele-MANAS (${TELE_MANAS_PRIMARY} / ${TELE_MANAS_TOLL_FREE}) is free, confidential, available 24/7 in English, Hindi, and Telugu.`,
            teleManasPrimary: TELE_MANAS_PRIMARY,
            teleManasTollFree: TELE_MANAS_TOLL_FREE,
            emergencyNumber: EMERGENCY_NUMBER,
            counsellorContact: DEFAULT_CAMPUS_COUNSELLOR,
          };
        }

        if (entry.kind === 'CRISIS_MEDICAL') {
          return {
            status: 'crisis',
            isCrisis: true,
            kind: 'CRISIS_MEDICAL',
            message: `${studentName}, this sounds like a medical emergency requiring immediate assistance. Please access your Emergency Card, contact ${EMERGENCY_NUMBER} Emergency Medical Services, or notify your campus health center right now.`,
            teleManasPrimary: TELE_MANAS_PRIMARY,
            teleManasTollFree: TELE_MANAS_TOLL_FREE,
            emergencyNumber: EMERGENCY_NUMBER,
            counsellorContact: DEFAULT_CAMPUS_COUNSELLOR,
          };
        }
      }
    }

    if (isHyperbole) {
      return {
        status: 'clear',
        isCrisis: false,
        kind: 'CLEAR',
        message: 'Clear input',
        teleManasPrimary: TELE_MANAS_PRIMARY,
        teleManasTollFree: TELE_MANAS_TOLL_FREE,
        emergencyNumber: EMERGENCY_NUMBER,
        counsellorContact: DEFAULT_CAMPUS_COUNSELLOR,
      };
    }

    return {
      status: 'clear',
      isCrisis: false,
      kind: 'CLEAR',
      message: 'Clear input',
      teleManasPrimary: TELE_MANAS_PRIMARY,
      teleManasTollFree: TELE_MANAS_TOLL_FREE,
      emergencyNumber: EMERGENCY_NUMBER,
      counsellorContact: DEFAULT_CAMPUS_COUNSELLOR,
    };
  } catch (error) {
    return buildFailClosedResult(`Execution error: ${error instanceof Error ? error.message : String(error)}`, studentName);
  }
}

/**
 * Async evaluation wrapper with 1500 ms timeout guarantee.
 * An optional secondary classifier function may ONLY escalate a clear input to crisis, never demote.
 */
export async function evaluateCrisisGateAsync(
  input: string,
  studentName: string = 'Student',
  timeoutMs: number = 1500,
  classifierFn?: (input: string) => Promise<CrisisGateResult>
): Promise<CrisisGateResult> {
  const floorResult = evaluateCrisisGate(input, studentName);
  if (floorResult.isCrisis || floorResult.status === 'error') {
    return floorResult;
  }

  // If no classifier provided, return floor result immediately
  if (!classifierFn) {
    return floorResult;
  }

  // Race classifier against timeout timer
  try {
    const timeoutPromise = new Promise<CrisisGateResult>((resolve) => {
      setTimeout(() => {
        resolve(buildFailClosedResult('Crisis gate classifier timed out (>1500ms)', studentName));
      }, timeoutMs);
    });

    const classifierPromise = classifierFn(input).then((classifierResult) => {
      // Classifier can ONLY escalate, never demote
      if (classifierResult.isCrisis || classifierResult.status === 'crisis' || classifierResult.status === 'error') {
        return classifierResult;
      }
      return floorResult;
    }).catch((err) => {
      return buildFailClosedResult(`Classifier error: ${err instanceof Error ? err.message : String(err)}`, studentName);
    });

    return await Promise.race([classifierPromise, timeoutPromise]);
  } catch (e) {
    return buildFailClosedResult(`Execution error: ${e instanceof Error ? e.message : String(e)}`, studentName);
  }
}

export function evaluateCrisisGateStatus(input: string): CrisisKind {
  return evaluateCrisisGate(input).kind;
}
