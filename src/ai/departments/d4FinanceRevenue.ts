import { assertRule } from '../constitution';
import { DepartmentAgent, DepartmentTaskResult } from './types';

export const d4FinanceRevenueAgent: DepartmentAgent = {
  id: 'D4',
  name: 'Finance & Revenue AI',
  description: 'B2B institutional seat licensing, contract tier renewal forecasting, zero clinical access.',
  rules: ['Rule-L2', 'Rule-L8'],
  tools: ['b2b_seat_forecaster', 'licensing_renewals'],
  blastRadius: 'MEDIUM',
  killSwitchActive: false,

  async processTask(taskInput: Record<string, any>): Promise<DepartmentTaskResult> {
    assertRule('Rule-L2'); // Commerce Firewall: Monetization strictly via B2B institutional seat licensing
    assertRule('Rule-L8'); // Non-monetary points boundary

    if (this.killSwitchActive) {
      return {
        taskId: taskInput.taskId || `task_${Date.now()}`,
        departmentId: 'D4',
        status: 'HALTED_BY_KILL_SWITCH',
        ruleAsserted: 'Rule-L2',
        outputSummary: 'D4 Finance AI Department kill switch is ACTIVE. Task execution halted.',
      };
    }

    const campusCode = taskInput.campusCode || 'OU-HYD';
    const activeSeats = taskInput.activeSeats || 24500;
    const maxSeats = taskInput.maxSeats || 30000;
    const utilPct = Math.round((activeSeats / maxSeats) * 100);

    if (utilPct >= 85) {
      return {
        taskId: taskInput.taskId || `task_${Date.now()}`,
        departmentId: 'D4',
        status: 'PENDING_HUMAN_APPROVAL',
        ruleAsserted: 'Rule-L2',
        outputSummary: `Campus ${campusCode} seat utilization is at ${utilPct}% (${activeSeats}/${maxSeats}). Proposed B2B seat tier expansion proposal generated for institutional admin.`,
        proposedAction: {
          id: `act_${Date.now()}`,
          departmentId: 'D4',
          actionType: 'PROPOSE_SEAT_TIER_EXPANSION',
          description: `Propose B2B seat tier expansion for ${campusCode} from ${maxSeats} to ${maxSeats + 5000} seats.`,
          ruleId: 'Rule-L2',
          requiresHumanApproval: true,
          blastRadius: 'MEDIUM',
          inputData: { campusCode, activeSeats, maxSeats },
          timestamp: new Date().toISOString(),
        },
      };
    }

    return {
      taskId: taskInput.taskId || `task_${Date.now()}`,
      departmentId: 'D4',
      status: 'COMPLETED',
      ruleAsserted: 'Rule-L2',
      outputSummary: `Campus ${campusCode} seat licensing healthy (${utilPct}% capacity). B2B revenue projection stable.`,
    };
  },
};
