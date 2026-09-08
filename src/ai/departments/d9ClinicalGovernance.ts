import { assertRule } from '../constitution';
import { DepartmentAgent, DepartmentTaskResult } from './types';

export const d9ClinicalGovernanceAgent: DepartmentAgent = {
  id: 'D9',
  name: 'Clinical Governance AI (Advisory Only)',
  description: 'Clinical protocol drafting & NMC advisory preparation for Chief Medical Officer sign-off.',
  rules: ['Rule-K1', 'Rule-K8'],
  tools: ['clinical_advisory_drafter', 'cmo_signoff_queue'],
  blastRadius: 'HIGH',
  killSwitchActive: false,

  async processTask(taskInput: Record<string, any>): Promise<DepartmentTaskResult> {
    assertRule('Rule-K1'); // Two-Plane Separation: Zero access to identified student clinical records
    assertRule('Rule-K8'); // Pre-render audit logging for any clinical access

    if (this.killSwitchActive) {
      return {
        taskId: taskInput.taskId || `task_${Date.now()}`,
        departmentId: 'D9',
        status: 'HALTED_BY_KILL_SWITCH',
        ruleAsserted: 'Rule-K1',
        outputSummary: 'D9 Clinical Governance AI Department kill switch is ACTIVE. Task execution halted.',
      };
    }

    const advisoryTopic = taskInput.topic || 'Campus Monsoon Pyrexia Clinical Guidelines Update';

    return {
      taskId: taskInput.taskId || `task_${Date.now()}`,
      departmentId: 'D9',
      status: 'PENDING_HUMAN_APPROVAL',
      ruleAsserted: 'Rule-K1',
      outputSummary: `Drafted non-binding clinical governance advisory on "${advisoryTopic}". Queued for Chief Medical Officer (CMO) and NMC Registered Advisory Board review.`,
      proposedAction: {
        id: `act_${Date.now()}`,
        departmentId: 'D9',
        actionType: 'UPDATE_CLINICAL_GOVERNANCE_ADVISORY',
        description: `Adopt updated clinical protocol advisory on "${advisoryTopic}" for campus health centers.`,
        ruleId: 'Rule-K1',
        requiresHumanApproval: true,
        blastRadius: 'HIGH',
        inputData: { topic: advisoryTopic },
        timestamp: new Date().toISOString(),
      },
    };
  },
};
