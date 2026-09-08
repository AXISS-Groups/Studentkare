import { assertRule } from '../constitution';
import { DepartmentAgent, DepartmentTaskResult } from './types';

export const d7ContentLocalizationAgent: DepartmentAgent = {
  id: 'D7',
  name: 'Content & Localization AI',
  description: 'Multilingual health awareness QA & Medical Advisor sign-off queue manager.',
  rules: ['Rule-L3'],
  tools: ['translation_qa_engine', 'medical_signoff_queue'],
  blastRadius: 'LOW',
  killSwitchActive: false,

  async processTask(taskInput: Record<string, any>): Promise<DepartmentTaskResult> {
    assertRule('Rule-L3');

    if (this.killSwitchActive) {
      return {
        taskId: taskInput.taskId || `task_${Date.now()}`,
        departmentId: 'D7',
        status: 'HALTED_BY_KILL_SWITCH',
        ruleAsserted: 'Rule-L3',
        outputSummary: 'D7 Content & Localization AI Department kill switch is ACTIVE. Task execution halted.',
      };
    }

    const contentTitle = taskInput.title || 'Monsoon Fever Prevention Protocol';
    const targetLanguages = taskInput.languages || ['EN', 'TE', 'HI'];
    const isClinicalAdvice = taskInput.isClinicalAdvice !== false;

    if (isClinicalAdvice) {
      return {
        taskId: taskInput.taskId || `task_${Date.now()}`,
        departmentId: 'D7',
        status: 'PENDING_HUMAN_APPROVAL',
        ruleAsserted: 'Rule-L3',
        outputSummary: `Health awareness content "${contentTitle}" translated into ${targetLanguages.join(', ')}. Medical Advisor Sign-Off required before public release on Studentkare platform.`,
        proposedAction: {
          id: `act_${Date.now()}`,
          departmentId: 'D7',
          actionType: 'PUBLISH_HEALTH_AWARENESS_MODULE',
          description: `Publish translated health awareness module "${contentTitle}" across Indian campus portals.`,
          ruleId: 'Rule-L3',
          requiresHumanApproval: true,
          blastRadius: 'LOW',
          inputData: { title: contentTitle, languages: targetLanguages },
          timestamp: new Date().toISOString(),
        },
      };
    }

    return {
      taskId: taskInput.taskId || `task_${Date.now()}`,
      departmentId: 'D7',
      status: 'COMPLETED',
      ruleAsserted: 'Rule-L3',
      outputSummary: `Non-clinical content "${contentTitle}" translated and published across ${targetLanguages.join(', ')}.`,
    };
  },
};
