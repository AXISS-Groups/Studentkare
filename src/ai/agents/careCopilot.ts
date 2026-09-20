import { evaluateCrisisGate } from '../core/crisisGate';
import { assertRule, RuleId } from '../core/constitution';

export interface AIResponsePayload {
  message: string;
  ruleRef: RuleId;
  severity: 'LOW' | 'MODERATE' | 'URGENT_EMERGENCY';
  suggestedAction?: {
    label: string;
    actionType: 'NAVIGATE' | 'TRIGGER_SOS' | 'BOOK_CAMP' | 'CALL_HELPLINE';
    targetRoute?: string;
  };
}

export function processStudentCareMessage(userInput: string, studentName: string): AIResponsePayload {
  // Executable Constitution assertion at module entry point
  assertRule('Rule-A');
  assertRule('Rule-B');

  // P0.1 Deterministic Crisis Gate: evaluated BEFORE any secondary routing or fallback logic
  const crisisCheck = evaluateCrisisGate(userInput, studentName);

  if (crisisCheck.kind === 'CRISIS_SELF_HARM') {
    return {
      message: crisisCheck.message,
      ruleRef: 'Rule-B',
      severity: 'URGENT_EMERGENCY',
      suggestedAction: {
        label: 'Call Tele-MANAS 14416 Now',
        actionType: 'CALL_HELPLINE',
        targetRoute: 'tel:14416',
      },
    };
  }

  if (crisisCheck.kind === 'CRISIS_OVERDOSE') {
    return {
      message: crisisCheck.message,
      ruleRef: 'Rule-B',
      severity: 'URGENT_EMERGENCY',
      suggestedAction: {
        label: 'Contact Poison Helpline / Tele-MANAS',
        actionType: 'CALL_HELPLINE',
        targetRoute: 'tel:1800116117',
      },
    };
  }

  if (crisisCheck.kind === 'CRISIS_MEDICAL') {
    return {
      message: crisisCheck.message,
      ruleRef: 'Rule-B',
      severity: 'URGENT_EMERGENCY',
      suggestedAction: {
        label: 'Open Emergency SOS Card',
        actionType: 'TRIGGER_SOS',
        targetRoute: 'flow-06',
      },
    };
  }

  if (crisisCheck.isCrisis || crisisCheck.status === 'error' || crisisCheck.status === 'crisis') {
    return {
      message: crisisCheck.message,
      ruleRef: 'Rule-B',
      severity: 'URGENT_EMERGENCY',
      suggestedAction: {
        label: 'Call Emergency 112',
        actionType: 'CALL_HELPLINE',
        targetRoute: 'tel:112',
      },
    };
  }

  const query = userInput.toLowerCase();

  // Lab report query
  if (query.includes('cbc') || query.includes('blood test') || query.includes('hemoglobin') || query.includes('report')) {
    return {
      message: `In your latest CBC report from July 14, your Hemoglobin was 14.2 g/dL (normal range: 13.0–17.0) and Platelet count was 240,000 /µL. Both markers are within normal limits. Would you like to view the full FHIR observation timeline?`,
      ruleRef: 'Rule-A',
      severity: 'LOW',
      suggestedAction: {
        label: 'View Vault Records',
        actionType: 'NAVIGATE',
        targetRoute: 'flow-02',
      },
    };
  }

  // Camp Day query
  if (query.includes('camp') || query.includes('checkup') || query.includes('vitals') || query.includes('station')) {
    assertRule('Rule-J1');
    return {
      message: `The Monsoon Campus Health Camp is active today at the Student Health Centre (Building B). You have completed 3 of 5 stations (Vitals, Dental, BMI). Next available: Vision Screening (est. wait: 4 mins).`,
      ruleRef: 'Rule-J1',
      severity: 'LOW',
      suggestedAction: {
        label: 'Go to Camp Passport',
        actionType: 'NAVIGATE',
        targetRoute: 'flow-05',
      },
    };
  }

  // Default helpful response
  return {
    message: `Hello ${studentName}! I am your AI Care Assistant. I can help explain your lab reports, guide you to campus clinic services, check health camp schedules, or answer wellness questions. How can I support your health today?`,
    ruleRef: 'Rule-A',
    severity: 'LOW',
    suggestedAction: {
      label: 'Explore Health Library',
      actionType: 'NAVIGATE',
      targetRoute: 'flow-10',
    },
  };
}
