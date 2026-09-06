/**
 * StudentKare AI Safety & Crisis Gate
 * Pure-function, zero-dependency, fail-closed deterministic classifier.
 * Evaluated BEFORE any LLM or secondary care routing.
 */

export type CrisisKind = 'CRISIS_SELF_HARM' | 'CRISIS_MEDICAL' | 'CLEAR';

export type CrisisResult =
  | {
      kind: 'CRISIS_SELF_HARM';
      severity: 'URGENT';
      ruleRef: 'Rule-B';
      phone: '14416';
      message: string;
    }
  | {
      kind: 'CRISIS_MEDICAL';
      severity: 'URGENT';
      ruleRef: 'Rule-B';
      phone: '108';
      message: string;
    }
  | {
      kind: 'CLEAR';
    };

/**
 * Normalise text input for robust pattern matching.
 * - NFKC normalisation
 * - Lowercase
 * - Fold curly single/double quotes to straight equivalents
 * - Strip zero-width spaces and control characters
 * - Collapse multiple whitespaces into a single space
 */
export function normalizeInput(input: string): string {
  if (!input) return '';

  return input
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/[“”«»]/g, '"')
    .replace(/[\u200B-\u200D\uFEFF\u200E\u200F\u00A0\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Token patterns for Self-Harm and Suicide Risk (EN, HI, TE)
const SELF_HARM_PATTERNS: (string | RegExp)[] = [
  // English exact/phrase patterns & misspellings
  'kill myself',
  'kil myself',
  'suicide',
  'suicidal',
  'suicid',
  'end it all',
  'self harm',
  'selfharm',
  'cut myself',
  'cutting myself',
  'want to die',
  'wanna die',
  "can't take it",
  'cannot take it',
  "cant take it",
  'overdose',
  'harm myself',
  'taking my life',
  'take my life',
  'hurt myself',
  "don't want to live",
  'dont want to live',
  'end my life',
  'ending my life',
  "can't go on",
  'cant go on',
  'want to end',
  'hanging myself',
  'hopeless',
  // Hindi transliterations
  'mar jana',
  'marne',
  'khudkhushi',
  'aatmhatya',
  'apni jaan',
  'zeher',
  'jaan de',
  'jaan dunga',
  'jaan dungi',
  'marna hai',
  // Telugu transliterations
  'chachipovala',
  'chavakunda',
  'chavu',
  'chavalanipistondi',
  'chavalanipisthondi',
  'pranam tisukovala',
  'atmahathya',
  'chani povali',
  'chavalani',
];

// Token patterns for Acute Medical Emergency (EN, HI, TE)
const MEDICAL_EMERGENCY_PATTERNS: (string | RegExp)[] = [
  // English
  'chest pain',
  'difficulty breathing',
  'cannot breathe',
  "can't breathe",
  'cant breathe',
  'heart attack',
  'unconscious',
  'heavy bleeding',
  'severe bleeding',
  'stroke',
  'seizure',
  'fainted',
  'severe trauma',
  'choking',
  'cardiac arrest',
  'shortness of breath',
  'panic attack',
  // Hindi transliterations
  'saans nahi',
  'saans lene',
  'chhati me dard',
  'seene me dard',
  'dil ka daora',
  'behosh',
  'khoon beh',
  // Telugu transliterations
  'gunde noppi',
  'oopiri adadam ledu',
  'oopiri aadata ledu',
  'spruha thappindi',
  'raktham marigindi',
];

/**
 * Deterministic Crisis Gate Classifier.
 * Pure function: runs in O(1) time without network or LLM dependencies.
 * Fails CLOSED: ambiguous high-risk triggers return crisis.
 */
export function evaluateCrisisGate(rawInput: string, studentName: string = 'Student'): CrisisResult {
  const norm = normalizeInput(rawInput);

  if (!norm) {
    return { kind: 'CLEAR' };
  }

  // 1. Evaluate Self-Harm Risk
  const isSelfHarm = SELF_HARM_PATTERNS.some((pattern) => {
    if (typeof pattern === 'string') {
      return norm.includes(pattern);
    }
    return pattern.test(norm);
  });

  if (isSelfHarm) {
    return {
      kind: 'CRISIS_SELF_HARM',
      severity: 'URGENT',
      ruleRef: 'Rule-B',
      phone: '14416',
      message: `You are not alone, ${studentName}. We are here to support you right now. The National Tele-MANAS helpline (14416) and campus peer counsellors are available 24x7 confidentially. Please connect immediately by calling 14416 or reaching out to campus emergency.`,
    };
  }

  // 2. Evaluate Medical Emergency Risk
  const isMedicalEmergency = MEDICAL_EMERGENCY_PATTERNS.some((pattern) => {
    if (typeof pattern === 'string') {
      return norm.includes(pattern);
    }
    return pattern.test(norm);
  });

  if (isMedicalEmergency) {
    return {
      kind: 'CRISIS_MEDICAL',
      severity: 'URGENT',
      ruleRef: 'Rule-B',
      phone: '108',
      message: `CRITICAL ALERT: Your symptoms indicate a potential acute medical emergency. Do not wait for an online reply. 1-tap 108 Emergency Ambulance dispatch and campus clinic alerts are available immediately.`,
    };
  }

  return { kind: 'CLEAR' };
}
