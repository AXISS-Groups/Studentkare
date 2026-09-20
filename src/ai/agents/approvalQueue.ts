import { assertRule } from '../core/constitution';
import { DepartmentAction } from '../departments/types';

export interface ApprovalQueueEntry {
  id: string;
  action: DepartmentAction;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  submittedAt: string;
  evaluatedAt?: string;
  reviewedByAdminId?: string;
  rejectionReason?: string;
}

export class UnifiedApprovalQueue {
  private queue: ApprovalQueueEntry[] = [];

  constructor() {
    // Seed queue with sample pending proposals
    this.queue = [
      {
        id: 'prop_001',
        action: {
          id: 'act_101',
          departmentId: 'D2',
          actionType: 'ONBOARD_EMERGENCY_PROVIDER',
          description: 'Fast-track emergency care provider onboarding for campus pincode 500008 to satisfy Rule-J1 minimum coverage requirement.',
          ruleId: 'Rule-J1',
          requiresHumanApproval: true,
          blastRadius: 'MEDIUM',
          inputData: { pincode: '500008', activeProviderCount: 1 },
          timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
        },
        status: 'PENDING',
        submittedAt: new Date(Date.now() - 30 * 60000).toISOString(),
      },
      {
        id: 'prop_002',
        action: {
          id: 'act_102',
          departmentId: 'D9',
          actionType: 'UPDATE_CLINICAL_GOVERNANCE_ADVISORY',
          description: 'Adopt updated clinical protocol advisory on "Campus Monsoon Pyrexia Guidelines" for campus health centers.',
          ruleId: 'Rule-K1',
          requiresHumanApproval: true,
          blastRadius: 'HIGH',
          inputData: { topic: 'Monsoon Pyrexia Protocol' },
          timestamp: new Date(Date.now() - 60 * 60000).toISOString(),
        },
        status: 'PENDING',
        submittedAt: new Date(Date.now() - 60 * 60000).toISOString(),
      },
    ];
  }

  public enqueueAction(action: DepartmentAction): ApprovalQueueEntry {
    assertRule(action.ruleId);
    const entry: ApprovalQueueEntry = {
      id: `prop_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      action,
      status: 'PENDING',
      submittedAt: new Date().toISOString(),
    };
    this.queue.unshift(entry);
    return entry;
  }

  public getPendingProposals(): ApprovalQueueEntry[] {
    return this.queue.filter((e) => e.status === 'PENDING');
  }

  public getAllProposals(): ApprovalQueueEntry[] {
    return this.queue;
  }

  public approveProposal(proposalId: string, adminId: string): ApprovalQueueEntry {
    const entry = this.queue.find((e) => e.id === proposalId);
    if (!entry) {
      throw new Error(`[APPROVAL QUEUE]: Proposal "${proposalId}" not found.`);
    }
    assertRule(entry.action.ruleId);
    entry.status = 'APPROVED';
    entry.evaluatedAt = new Date().toISOString();
    entry.reviewedByAdminId = adminId;
    return entry;
  }

  public rejectProposal(proposalId: string, adminId: string, reason: string): ApprovalQueueEntry {
    const entry = this.queue.find((e) => e.id === proposalId);
    if (!entry) {
      throw new Error(`[APPROVAL QUEUE]: Proposal "${proposalId}" not found.`);
    }
    assertRule(entry.action.ruleId);
    entry.status = 'REJECTED';
    entry.evaluatedAt = new Date().toISOString();
    entry.reviewedByAdminId = adminId;
    entry.rejectionReason = reason;
    return entry;
  }
}

export const approvalQueueManager = new UnifiedApprovalQueue();
