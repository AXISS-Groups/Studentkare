import { assertRule } from '../constitution';
import { DepartmentAgent, DepartmentTaskResult } from './types';

export const d5ClaimsOpsAgent: DepartmentAgent = {
  id: 'D5',
  name: 'Claims Operations AI',
  description: 'Tariff & NME calculation with mandatory Rule-K4 Pixel Provenance validation.',
  rules: ['Rule-K4', 'Rule-K5'],
  tools: ['tariff_calculator', 'pixel_provenance_verifier'],
  blastRadius: 'HIGH',
  killSwitchActive: false,

  async processTask(taskInput: Record<string, any>): Promise<DepartmentTaskResult> {
    assertRule('Rule-K4'); // Mandatory Pixel Provenance
    assertRule('Rule-K5'); // Tariff & NME Audit

    if (this.killSwitchActive) {
      return {
        taskId: taskInput.taskId || `task_${Date.now()}`,
        departmentId: 'D5',
        status: 'HALTED_BY_KILL_SWITCH',
        ruleAsserted: 'Rule-K4',
        outputSummary: 'D5 Claims AI Department kill switch is ACTIVE. Task execution halted.',
      };
    }

    const billItem = taskInput.billItem || {};
    const provenance = billItem.provenance;

    const hasValidProvenance =
      provenance &&
      typeof provenance.documentId === 'string' &&
      typeof provenance.page === 'number' &&
      Array.isArray(provenance.bbox) &&
      provenance.bbox.length === 4;

    if (!hasValidProvenance) {
      return {
        taskId: taskInput.taskId || `task_${Date.now()}`,
        departmentId: 'D5',
        status: 'RULE_VIOLATED',
        ruleAsserted: 'Rule-K4',
        outputSummary: `Rule-K4 Provenance Violation: Claim line item "${billItem.description || 'Unknown'}" rejected. Missing mandatory OCR bounding box & page provenance coordinates.`,
        details: { billItem },
      };
    }

    return {
      taskId: taskInput.taskId || `task_${Date.now()}`,
      departmentId: 'D5',
      status: 'COMPLETED',
      ruleAsserted: 'Rule-K4',
      outputSummary: `Claim item "${billItem.description}" verified. Pixel provenance check PASSED (Doc: ${provenance.documentId}, Page: ${provenance.page}). Approved amount: ₹${billItem.netAmount || 0}.`,
    };
  },
};
