/**
 * Studentkare — Crisis Gate Evaluator (M-5.1)
 * Detects self-harm, medical emergency, and overdose/toxicity queries.
 *
 * Rules:
 * 1. Fails closed. Self-harm recall target is 100%.
 * 2. Overdose/toxicity queries MUST NEVER return lethal dose, maximum dose, or toxicity thresholds.
 * 3. Immediately routes to National Poison Helpline (1800-116-117) and Tele-MANAS (14416).
 */

export interface CrisisGateResult {
  isCrisis: boolean;
  kind: 'CRISIS_SELF_HARM' | 'CRISIS_MEDICAL' | 'CRISIS_OVERDOSE' | 'CLEAR';
  message: string;
}

const SELF_HARM_PATTERNS = [
  /end\s+(my\s+)?life/i,
  /end\s+it\s+all/i,
  /kill\s+my\s*self/i,
  /kil\s+my\s*self/i,
  /suicid(e|al)/i,
  /sucidal/i,
  /self\s*harm/i,
  /cut(ting)?\s+(my\s+)?wrist/i,
  /exit\s+from\s+this\s+world/i,
  /can['’]?t\s+take\s+it\s+any\s*more/i,
  /जान\s+लेना/i,
  /marne\s+ka\s+man/i,
  /ji\s+sakta/i,
  /చనిపోవాలని/i,
  /chani\s*povali/i,
  /cheskuntanu/i,
];

const OVERDOSE_PATTERNS = [
  /how\s+many\s+pills\s+to\s+die/i,
  /lethal\s+dose/i,
  /overdose/i,
  /how\s+much\s+is\s+too\s+much/i,
  /maximum\s+dose\s+to\s+pass\s+out/i,
  /toxic\s+limit/i,
  /how\s+many\s+crocin\s+to\s+kill/i,
];

const MEDICAL_EMERGENCY_PATTERNS = [
  /chest\s+pain/i,
  /can(not|'t)\s+breathe/i,
  /bleeding\s+heavily/i,
  /swelling\s+throat/i,
];

const CLEAR_HYPERBOLE_PATTERNS = [
  /dying\s+of\s+boredom/i,
  /assignment\s+is\s+killing\s+me/i,
  /murder\s+a\s+biryani/i,
  /dead\s+tired/i,
  /battery\s+died/i,
];

export function evaluateCrisisGate(input: string, studentName: string = 'Student'): CrisisGateResult {
  const normalized = input.trim().toLowerCase();

  // 1. Check hyperbole allowlist
  for (const pattern of CLEAR_HYPERBOLE_PATTERNS) {
    if (pattern.test(normalized)) {
      return { isCrisis: false, kind: 'CLEAR', message: 'Clear input' };
    }
  }

  // 2. Check overdose / toxicity intent queries (STRICT: NO DOSE INFO)
  for (const pattern of OVERDOSE_PATTERNS) {
    if (pattern.test(normalized)) {
      return {
        isCrisis: true,
        kind: 'CRISIS_OVERDOSE',
        message: `${studentName}, if you or someone you know has taken too much medication or is in danger of an overdose, please seek immediate emergency care. Call the National Poison Information Centre at 1800-116-117 or Emergency Services at 108.`,
      };
    }
  }

  // 3. Check self-harm signals (High priority)
  for (const pattern of SELF_HARM_PATTERNS) {
    if (pattern.test(normalized)) {
      return {
        isCrisis: true,
        kind: 'CRISIS_SELF_HARM',
        message: `${studentName}, I hear that you are going through a very painful time. You are not alone. Please talk to someone right now who can support you. Tele-MANAS (14416 / 1800 891 4416) is free, confidential, available 24/7 in English, Hindi, and Telugu.`,
      };
    }
  }

  // 4. Check medical emergency signals
  for (const pattern of MEDICAL_EMERGENCY_PATTERNS) {
    if (pattern.test(normalized)) {
      return {
        isCrisis: true,
        kind: 'CRISIS_MEDICAL',
        message: `${studentName}, this sounds like a medical emergency requiring immediate assistance. Please access your Emergency Card, contact 108 Emergency Medical Services, or notify your campus health center right now.`,
      };
    }
  }

  return { isCrisis: false, kind: 'CLEAR', message: 'Clear input' };
}

export function evaluateCrisisGateStatus(input: string): 'CRISIS_SELF_HARM' | 'CRISIS_MEDICAL' | 'CRISIS_OVERDOSE' | 'CLEAR' {
  return evaluateCrisisGate(input).kind;
}
