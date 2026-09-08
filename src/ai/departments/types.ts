import { RuleId } from '../constitution';

export type DepartmentId = 'D1' | 'D2' | 'D3' | 'D4' | 'D5' | 'D6' | 'D7' | 'D8' | 'D9';

export type ActionType = string;
export type ToolAllowlist = string[];

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

export interface Department {
  id: DepartmentId;
  name: string;
  description: string;
  rules: RuleId[];
  plane?: 'OPERATIONAL';
  tools: ToolAllowlist;
  autoExecute?: ActionType[];
  blastRadius: 'LOW' | 'MEDIUM' | 'HIGH' | ((action: { type: ActionType; details?: any }) => 'LOW' | 'MEDIUM' | 'HIGH');
  killSwitch?: boolean;
  processTask: (taskInput: Record<string, any>) => Promise<DepartmentTaskResult>;
}

export interface DepartmentAgent extends Department {
  killSwitchActive: boolean;
}
