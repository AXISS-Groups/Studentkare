import { RuleId } from '../ai/constitution';

export type BreakGlassReason =
  | 'SAFETY_ESCALATION'
  | 'DPDP_DATA_PRINCIPAL_REQUEST'
  | 'LEGAL_ORDER'
  | 'INCIDENT_INVESTIGATION'
  | 'STUDENT_SUPPORT_TICKET';

export type SensitiveCategory = 'MENTAL_HEALTH' | 'REPRODUCTIVE' | 'HIV' | 'NONE';

export interface BreakGlassSession {
  id: string;
  studentId: string;
  requestedByAdminId: string;
  requestedByAdminName: string;
  reasonCategory: BreakGlassReason;
  reasonText: string;
  scope: ('LAB' | 'PRESCRIPTION' | 'VACCINE' | 'CAMP_REPORT' | 'DISCHARGE_SUMMARY')[];
  dualApproverAdminId: string;
  dualApproverAdminName: string;
  sensitiveCategoryApproverId?: string;
  sensitiveCategory?: SensitiveCategory;
  createdAt: string;
  expiresAt: string; // ISO timestamp (+60 mins)
  active: boolean;
  auditEntryId: string;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorType: 'HUMAN_ADMIN' | 'AGENT' | 'SYSTEM';
  action: string;
  departmentId?: string;
  ruleId: RuleId;
  institutionId?: string | null;
  resourceType: string;
  resourceId?: string;
  details: Record<string, any>;
}

/**
 * Utility to format aggregate counts enforcing Rule K-Anonymity (floor = 20).
 * Prevents identity leakage across small campus or department cohorts.
 */
export function formatKAnonymityCount(count: number): string {
  if (count < 20) {
    return '< 20 (Suppressed under K-Anonymity Rule)';
  }
  return count.toLocaleString('en-IN');
}
