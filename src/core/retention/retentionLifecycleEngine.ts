/**
 * Retention & Lifecycle State Machine — P57 Retention & Graduation
 * 
 * Manages student lifecycle transitions:
 * ACTIVE -> GRADUATED -> ARCHIVED -> ELIGIBLE_FOR_PURGE
 * Enforces 7-year NMC medical record retention requirement.
 */

export type StudentLifecycleState = 
  | 'ACTIVE' 
  | 'GRADUATED' 
  | 'ARCHIVED' 
  | 'ELIGIBLE_FOR_PURGE';

export interface RetentionStatus {
  state: StudentLifecycleState;
  graduationDate?: string; // ISO String
  archivedAt?: string;
  medicalHoldActive: boolean;
  legalPurgeDate?: string;
}

export class RetentionLifecycleEngine {
  private static LEGAL_RETENTION_YEARS = 7;

  /**
   * Advances student state upon graduation
   */
  public processGraduation(currentStatus: RetentionStatus): RetentionStatus {
    if (currentStatus.state !== 'ACTIVE') {
      throw new Error(`Invalid state transition: Cannot graduate student in state ${currentStatus.state}`);
    }

    const now = new Date();
    const purgeDate = new Date();
    purgeDate.setFullYear(now.getFullYear() + RetentionLifecycleEngine.LEGAL_RETENTION_YEARS);

    return {
      state: 'GRADUATED',
      graduationDate: now.toISOString(),
      medicalHoldActive: true, // 7-year legal hold begins
      legalPurgeDate: purgeDate.toISOString()
    };
  }

  /**
   * Archives record after 1 year of graduation
   */
  public processArchival(currentStatus: RetentionStatus): RetentionStatus {
    if (currentStatus.state !== 'GRADUATED') {
      throw new Error(`Invalid state transition: Cannot archive student in state ${currentStatus.state}`);
    }

    return {
      ...currentStatus,
      state: 'ARCHIVED',
      archivedAt: new Date().toISOString()
    };
  }

  /**
   * Evaluates if record can transition to ELIGIBLE_FOR_PURGE after 7-year legal hold expires
   */
  public evaluatePurgeEligibility(
    status: RetentionStatus,
    nowTimestamp: number = Date.now()
  ): RetentionStatus {
    if (status.state !== 'ARCHIVED' || !status.legalPurgeDate) {
      return status;
    }

    const purgeTime = new Date(status.legalPurgeDate).getTime();
    if (nowTimestamp >= purgeTime) {
      return {
        ...status,
        state: 'ELIGIBLE_FOR_PURGE',
        medicalHoldActive: false
      };
    }

    return status;
  }
}
