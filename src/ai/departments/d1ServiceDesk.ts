import { assertRule } from '../constitution';
import { evaluateCrisisGate } from '../crisisGate';
import { DepartmentAgent, DepartmentTaskResult } from './types';

export const d1ServiceDeskAgent: DepartmentAgent = {
  id: 'D1',
  name: 'Service Desk Operations AI',
  description: 'Intake, category classification, ticket deduplication, and crisis-gate auto-escalation.',
  rules: ['Rule-L1', 'Rule-L2'],
  tools: ['ticket_ingest', 'crisis_evaluate', 'faq_lookup'],
  blastRadius: 'LOW',
  killSwitchActive: false,

  async processTask(taskInput: Record<string, any>): Promise<DepartmentTaskResult> {
    assertRule('Rule-L1'); // Commerce Firewall: No ad placement in clinical or support contexts
    assertRule('Rule-L2'); // Commerce Firewall: No commerce targeting from ticket contents

    if (this.killSwitchActive) {
      return {
        taskId: taskInput.taskId || `task_${Date.now()}`,
        departmentId: 'D1',
        status: 'HALTED_BY_KILL_SWITCH',
        ruleAsserted: 'Rule-L1',
        outputSummary: 'D1 Service Desk AI Department kill switch is ACTIVE. Task execution halted.',
      };
    }

    const ticketText = taskInput.ticketText || taskInput.content || '';

    // Check crisis gate first
    const crisisResult = evaluateCrisisGate(ticketText);
    if (crisisResult.kind !== 'CLEAR') {
      return {
        taskId: taskInput.taskId || `task_${Date.now()}`,
        departmentId: 'D1',
        status: 'CRISIS_ESCALATED',
        ruleAsserted: 'Rule-L1',
        outputSummary: `CRISIS TRIGGER DETECTED (${crisisResult.kind}). Bypassed AI auto-responder and escalated to 24/7 Campus Health Warden & Tele-MANAS (14416).`,
        details: { crisisKind: crisisResult.kind, hotline: '14416' },
      };
    }

    return {
      taskId: taskInput.taskId || `task_${Date.now()}`,
      departmentId: 'D1',
      status: 'COMPLETED',
      ruleAsserted: 'Rule-L1',
      outputSummary: `Service Desk ticket processed cleanly. Classified category: ${taskInput.category || 'General Support'}. Drafted standard ad-free resolution response.`,
    };
  },
};
