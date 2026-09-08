/**
 * Studentkare — Institution Console k-Anonymity Guard (UI-3.3)
 * Compliance: DPDP Act 2023, DPDP Rules 2025 (k-anonymity floor Rule-K8)
 *
 * Enforces k-anonymity floor k=20 at both query and UI layers.
 * Groups smaller than 20 students are suppressed automatically.
 * Rule: "You see counts, never individual results."
 */

export interface CohortAggregateMetric {
  departmentOrGroup: string;
  totalStudentsInCohort: number;
  metricLabel: string;
  aggregateValue: number | string;
  isSuppressed: boolean;
  suppressionReason?: string;
}

export class InstitutionConsoleQueryGuard {
  private static readonly K_ANONYMITY_FLOOR = 20;

  /**
   * Evaluates a cohort metric against the k-anonymity floor of 20.
   * If cohort size is < 20, suppresses the metric from rendering.
   */
  static applyAnonymityFloor(
    departmentOrGroup: string,
    cohortSize: number,
    metricLabel: string,
    rawAggregateValue: number | string
  ): CohortAggregateMetric {
    if (cohortSize < this.K_ANONYMITY_FLOOR) {
      return {
        departmentOrGroup,
        totalStudentsInCohort: cohortSize,
        metricLabel,
        aggregateValue: "SUPPRESSED",
        isSuppressed: true,
        suppressionReason: `Cohort size (${cohortSize}) is below k-anonymity floor (${this.K_ANONYMITY_FLOOR}). Data suppressed to protect privacy.`,
      };
    }

    return {
      departmentOrGroup,
      totalStudentsInCohort: cohortSize,
      metricLabel,
      aggregateValue: rawAggregateValue,
      isSuppressed: false,
    };
  }

  /**
   * Filters an array of cohort metrics, automatically suppressing groups < 20.
   */
  static filterCohortMetrics(metrics: Array<{ group: string; count: number; value: any; label: string }>): CohortAggregateMetric[] {
    return metrics.map((m) =>
      this.applyAnonymityFloor(m.group, m.count, m.label, m.value)
    );
  }
}
