import { ChatMessage } from '../types';

export interface AIResponsePayload {
  message: string;
  ruleRef: string;
  severity: 'LOW' | 'MODERATE' | 'URGENT_EMERGENCY';
  suggestedAction?: {
    label: string;
    actionType: 'NAVIGATE' | 'TRIGGER_SOS' | 'BOOK_CAMP' | 'CALL_HELPLINE';
    targetRoute?: string;
  };
}

export function processStudentCareMessage(userInput: string, studentName: string): AIResponsePayload {
  const query = userInput.toLowerCase();

  // Rule B Emergency Checks
  if (
    query.includes('chest pain') ||
    query.includes('difficulty breathing') ||
    query.includes('cannot breathe') ||
    query.includes('heart attack') ||
    query.includes('unconscious') ||
    query.includes('heavy bleeding')
  ) {
    return {
      message: `CRITICAL ALERT: Your symptoms indicate a potential medical emergency. Do not wait for an online reply. We have enabled 1-tap 108 Emergency Ambulance dispatch and campus clinic alert for you immediately.`,
      ruleRef: 'Rule-B: Emergency Triage Escalation',
      severity: 'URGENT_EMERGENCY',
      suggestedAction: {
        label: 'Open Emergency SOS Card',
        actionType: 'TRIGGER_SOS',
        targetRoute: 'flow-06',
      },
    };
  }

  // Mental Health crisis
  if (
    query.includes('depressed') ||
    query.includes('kill myself') ||
    query.includes('suicide') ||
    query.includes('hopeless') ||
    query.includes('panic attack') ||
    query.includes('can’t take it')
  ) {
    return {
      message: `You are not alone, ${studentName}. We are here to support you. Campus peer counsellors and the National Tele-MANAS (14416) helpline are available 24x7 confidentially. Would you like to connect right now?`,
      ruleRef: 'Rule-A: Evidence-based Triage & Mental Health Safety',
      severity: 'MODERATE',
      suggestedAction: {
        label: 'Book Confidential Counsellor',
        actionType: 'NAVIGATE',
        targetRoute: 'flow-07',
      },
    };
  }

  // Lab report query
  if (query.includes('cbc') || query.includes('blood test') || query.includes('hemoglobin') || query.includes('report')) {
    return {
      message: `In your latest CBC report from July 14, your Hemoglobin was 14.2 g/dL (normal range: 13.0–17.0) and Platelet count was 240,000 /µL. Both markers are within normal limits. Would you like to view the full FHIR observation timeline?`,
      ruleRef: 'Rule-A: Non-prescriptive Health Guidance',
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
    return {
      message: `The Monsoon Campus Health Camp is active today at the Student Health Centre (Building B). You have completed 3 of 5 stations (Vitals, Dental, BMI). Next available: Vision Screening (est. wait: 4 mins).`,
      ruleRef: 'Rule-J: Real-time Camp Telemetry',
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
    ruleRef: 'Rule-A: Educational Wellness Support',
    severity: 'LOW',
    suggestedAction: {
      label: 'Explore Health Library',
      actionType: 'NAVIGATE',
      targetRoute: 'flow-10',
    },
  };
}
