/**
 * Incident Response & Emergency Kill Switches — P43 Incident Response
 * 
 * Provides global and feature-scoped emergency kill-switches, severity classification
 * (P0 Crisis to P3 Low), and breach containment controls.
 */

export type IncidentSeverity = 'P0_CRISIS' | 'P1_MAJOR' | 'P2_MODERATE' | 'P3_LOW';

export type FeatureFlagKey = 
  | 'PHI_ACCESS' 
  | 'TELECONSULT_BOOKING' 
  | 'PARTNER_INTEGRATION_SYNC' 
  | 'PAYMENTS_CHECKOUT' 
  | 'M18_CLINICAL_PREDICTIONS';

export interface ActiveIncident {
  incidentId: string;
  severity: IncidentSeverity;
  title: string;
  triggeredAt: string;
  affectedFeatures: FeatureFlagKey[];
  isResolved: boolean;
}

export class IncidentKillSwitch {
  private activeKillSwitches: Set<FeatureFlagKey> = new Set();
  private incidents: Map<string, ActiveIncident> = new Map();

  /**
   * Triggers an emergency kill-switch for a feature
   */
  public activateKillSwitch(feature: FeatureFlagKey): void {
    this.activeKillSwitches.add(feature);
  }

  /**
   * Restores feature operation after incident resolution
   */
  public deactivateKillSwitch(feature: FeatureFlagKey): void {
    this.activeKillSwitches.delete(feature);
  }

  /**
   * Checks if feature execution is allowed (fails closed if kill-switch active)
   */
  public isFeatureAllowed(feature: FeatureFlagKey): boolean {
    return !this.activeKillSwitches.has(feature);
  }

  /**
   * Logs a new incident and automatically activates kill-switches if P0/P1
   */
  public declareIncident(
    severity: IncidentSeverity,
    title: string,
    affectedFeatures: FeatureFlagKey[]
  ): ActiveIncident {
    const incidentId = `INC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const incident: ActiveIncident = {
      incidentId,
      severity,
      title,
      triggeredAt: new Date().toISOString(),
      affectedFeatures,
      isResolved: false
    };

    this.incidents.set(incidentId, incident);

    // Fail closed: Automatically activate kill switches for P0 or P1 incidents
    if (severity === 'P0_CRISIS' || severity === 'P1_MAJOR') {
      for (const feat of affectedFeatures) {
        this.activateKillSwitch(feat);
      }
    }

    return incident;
  }
}
