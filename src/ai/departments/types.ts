import { RuleId } from '../constitution';

export type DepartmentId = 'D1' | 'D2' | 'D3' | 'D4' | 'D5' | 'D6' | 'D7' | 'D8' | 'D9';

export interface DepartmentAction {
  id: string;
  departmentId: DepartmentId;
  actionType: string;
  description: string;
  ruleId: RuleId;
  requiresHumanApproval: boolean;
  blastRadius: 'LOW' | 'MEDIUM' | 'HIGH';
  inputData: Record<string, any>;
  timestamp: string;
}

export interface DepartmentTaskResult {
  taskId: string;
  departmentId: DepartmentId;
  status: 'COMPLETED' | 'PENDING_HUMAN_APPROVAL' | 'HALTED_BY_KILL_SWITCH' | 'CRISIS_ESCALATED' | 'RULE_VIOLATED';
  ruleAsserted: RuleId;
  outputSummary: string;
  proposedAction?: DepartmentAction;
  details?: Record<string, any>;
}

export interface DepartmentAgent {
  id: DepartmentId;
  name: string;
  description: string;
  rules: RuleId[];
  tools: string[];
  blastRadius: 'LOW' | 'MEDIUM' | 'HIGH';
  killSwitchActive: boolean;
  processTask: (taskInput: Record<string, any>) => Promise<DepartmentTaskResult>;
}
