import { assertRule } from '../constitution';
import { formatKAnonymityCount } from '../../types/admin';
import { DepartmentAgent, DepartmentTaskResult } from './types';

export const d6InstitutionSuccessAgent: DepartmentAgent = {
  id: 'D6',
  name: 'Institution Success AI',
  description: 'Campus aggregate health telemetry analyzer enforcing K-Anonymity (floor = 20).',
  rules: ['Rule-K-Anonymity'],
  tools: ['aggregate_telemetry_analyzer', 'k_anonymity_suppressor'],
  blastRadius: 'LOW',
  killSwitchActive: false,

  async processTask(taskInput: Record<string, any>): Promise<DepartmentTaskResult> {
    assertRule('Rule-K-Anonymity');

    if (this.killSwitchActive) {
      return {
        taskId: taskInput.taskId || `task_${Date.now()}`,
        departmentId: 'D6',
        status: 'HALTED_BY_KILL_SWITCH',
        ruleAsserted: 'Rule-K-Anonymity',
        outputSummary: 'D6 Institution Success AI Department kill switch is ACTIVE. Task execution halted.',
      };
    }

    const cohortName = taskInput.cohortName || 'Campus Clinic Pod 3';
    const rawCount = typeof taskInput.cohortCount === 'number' ? taskInput.cohortCount : 14;

    const formatted = formatKAnonymityCount(rawCount);

    return {
      taskId: taskInput.taskId || `task_${Date.now()}`,
      departmentId: 'D6',
      status: 'COMPLETED',
      ruleAsserted: 'Rule-K-Anonymity',
      outputSummary: `Cohort "${cohortName}" analyzed. Enforced K-Anonymity floor = 20. Count output: ${formatted}.`,
      details: { cohortName, rawCount, formattedCount: formatted },
    };
  },
};
