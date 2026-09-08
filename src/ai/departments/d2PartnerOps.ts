import { assertRule } from '../constitution';
import { DepartmentAgent, DepartmentTaskResult } from './types';

export const d2PartnerOpsAgent: DepartmentAgent = {
  id: 'D2',
  name: 'Partner & Supply Ops AI',
  description: 'Healthcare provider registry SLA monitoring & Rule-J1 minimum pincode coverage verification.',
  rules: ['Rule-J1', 'Rule-L7'],
  tools: ['pincode_coverage_check', 'vendor_sla_audit'],
  blastRadius: 'MEDIUM',
  killSwitchActive: false,

  async processTask(taskInput: Record<string, any>): Promise<DepartmentTaskResult> {
    assertRule('Rule-J1'); // Minimum 2 providers per pincode
    assertRule('Rule-L7'); // Consent-gated partner access

    if (this.killSwitchActive) {
      return {
        taskId: taskInput.taskId || `task_${Date.now()}`,
        departmentId: 'D2',
        status: 'HALTED_BY_KILL_SWITCH',
        ruleAsserted: 'Rule-J1',
        outputSummary: 'D2 Partner Ops AI Department kill switch is ACTIVE. Task execution halted.',
      };
    }

    const pincode = taskInput.pincode || '500007';
    const activeProviderCount = taskInput.activeProviderCount || 3;

    if (activeProviderCount < 2) {
      return {
        taskId: taskInput.taskId || `task_${Date.now()}`,
        departmentId: 'D2',
        status: 'PENDING_HUMAN_APPROVAL',
        ruleAsserted: 'Rule-J1',
        outputSummary: `Rule-J1 Violation: Pincode ${pincode} has only ${activeProviderCount} active emergency providers (< 2 minimum). Proposed emergency vendor onboarding action queued.`,
        proposedAction: {
          id: `act_${Date.now()}`,
          departmentId: 'D2',
          actionType: 'ONBOARD_EMERGENCY_PROVIDER',
          description: `Fast-track emergency care provider onboarding for campus pincode ${pincode} to satisfy Rule-J1 minimum coverage requirement.`,
          ruleId: 'Rule-J1',
          requiresHumanApproval: true,
          blastRadius: 'MEDIUM',
          inputData: { pincode, activeProviderCount },
          timestamp: new Date().toISOString(),
        },
      };
    }

    return {
      taskId: taskInput.taskId || `task_${Date.now()}`,
      departmentId: 'D2',
      status: 'COMPLETED',
      ruleAsserted: 'Rule-J1',
      outputSummary: `Pincode ${pincode} meets Rule-J1 minimum provider coverage (${activeProviderCount} active emergency providers).`,
    };
  },
};
