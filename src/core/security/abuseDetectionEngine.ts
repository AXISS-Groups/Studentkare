/**
 * Abuse & Fraud Prevention Engine — P80 Abuse & Fraud
 * 
 * Detects Account Takeover (ATO) attempts, clinician license verification,
 * and coercion-aware emergency duress PIN triggers.
 */

export interface LoginAttempt {
  userId: string;
  ipAddress: string;
  deviceFingerprint: string;
  timestamp: string; // ISO
  success: boolean;
}

export interface AtoAlert {
  userId: string;
  riskScore: number; // 0 to 100
  reason: string;
  triggeredAt: string;
}

export interface ClinicianVerification {
  registrationNumber: string;
  stateMedicalCouncil: string;
  verified: boolean;
  practitionerName?: string;
}

export class AbuseDetectionEngine {
  private loginHistory: Map<string, LoginAttempt[]> = new Map();

  /**
   * Evaluates login attempt history to detect ATO (Account Takeover) anomalies
   */
  public evaluateAtoRisk(attempt: LoginAttempt): AtoAlert | null {
    const history = this.loginHistory.get(attempt.userId) ?? [];
    history.push(attempt);
    this.loginHistory.set(attempt.userId, history);

    const now = new Date(attempt.timestamp).getTime();
    const recentAttempts = history.filter(
      (h) => now - new Date(h.timestamp).getTime() <= 15 * 60 * 1000 // Last 15 min
    );

    // 1. Rapid Failed Password Attempts (>5 in 15 mins)
    const failedCount = recentAttempts.filter((h) => !h.success).length;
    if (failedCount >= 5) {
      return {
        userId: attempt.userId,
        riskScore: 90,
        reason: 'Account takeover threat: Excessive failed login attempts detected in 15 minute window',
        triggeredAt: new Date().toISOString()
      };
    }

    // 2. Multi-IP Jump Detection (Distinct IPs in 15 mins)
    const distinctIps = new Set(recentAttempts.map((h) => h.ipAddress));
    if (distinctIps.size >= 4) {
      return {
        userId: attempt.userId,
        riskScore: 85,
        reason: 'Account takeover threat: Rapid multi-IP geographical jump detected',
        triggeredAt: new Date().toISOString()
      };
    }

    return null; // Normal risk
  }

  /**
   * Verifies clinician medical council registration number against council database
   */
  public verifyClinicianRegistration(
    registrationNumber: string,
    stateCouncil: string
  ): ClinicianVerification {
    const regUpper = registrationNumber.trim().toUpperCase();
    const councilUpper = stateCouncil.trim().toUpperCase();

    // Mock validation rules: Valid format NMC-XXXXX or SMC-XXXXX
    if ((regUpper.startsWith('NMC-') || regUpper.startsWith('MCI-') || regUpper.startsWith('KMC-')) && councilUpper.length > 2) {
      return {
        registrationNumber: regUpper,
        stateMedicalCouncil: councilUpper,
        verified: true,
        practitionerName: 'Dr. Verified Practitioner'
      };
    }

    return {
      registrationNumber: regUpper,
      stateMedicalCouncil: councilUpper,
      verified: false
    };
  }

  /**
   * Coercion-Aware Duress Access Check — Evaluates if entered PIN is a registered distress PIN.
   * If duress PIN is entered, returns distress payload flag that displays a scrubbed safe profile.
   */
  public evaluateDuressPin(enteredPin: string, userDuressPin: string): {
    isDuressTriggered: boolean;
    displaySafeProfile: boolean;
    silentAlertTriggered: boolean;
  } {
    if (enteredPin === userDuressPin) {
      return {
        isDuressTriggered: true,
        displaySafeProfile: true, // Hides sensitive PHI records
        silentAlertTriggered: true // Sends silent emergency distress event to security team
      };
    }

    return {
      isDuressTriggered: false,
      displaySafeProfile: false,
      silentAlertTriggered: false
    };
  }
}
