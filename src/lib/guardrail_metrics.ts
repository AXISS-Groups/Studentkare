/**
 * Studentkare — Guardrail Metrics & Zero-Tolerance Alerting
 * Compliance: M-4.1 to M-4.7 Metrics Specification
 *
 * Zero-Tolerance Alerting:
 * - Points awarded for clinical actions or blood donation (MUST BE 0)
 * - Commercial impressions on clinical surfaces (MUST BE 0)
 * - Consent grants completed in < 3 seconds (MUST BE 0)
 * - Unapproved break-glass sessions (MUST BE 0)
 */

export interface GuardrailMetricEvent {
  metricName: string;
  value: number;
  expectedMaxAllowed: 0;
  details?: string;
}

export class GuardrailMetricsMonitor {
  private violationsCount: number = 0;

  recordMetricCheck(metricName: string, value: number, details?: string): boolean {
    if (value > 0) {
      this.violationsCount++;
      console.error(
        `[GUARDRAIL_ALERT] VIOLATION DETECTED: Metric "${metricName}" value is ${value}. Expected: 0. Details: ${details || 'None'}`
      );
      return false;
    }
    return true;
  }

  checkPointsAwardedForBloodDonation(pointsCount: number): boolean {
    return this.recordMetricCheck("points_awarded_blood_donation", pointsCount, "Points for blood donation are strictly prohibited");
  }

  checkCommercialImpressionsOnClinicalSurface(impressions: number): boolean {
    return this.recordMetricCheck("commercial_impressions_clinical_surface", impressions, "Commercial impressions prohibited on clinical views");
  }

  checkFastConsentGrants(grantsUnder3s: number): boolean {
    return this.recordMetricCheck("consent_grants_under_3s", grantsUnder3s, "Dark pattern signal: consent granted under 3s");
  }

  getViolationsCount(): number {
    return this.violationsCount;
  }
}

export const guardrailMetricsMonitor = new GuardrailMetricsMonitor();
