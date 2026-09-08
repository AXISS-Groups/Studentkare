import { d1ServiceDeskAgent } from './d1ServiceDesk';
import { d2PartnerOpsAgent } from './d2PartnerOps';
import { d3ComplianceAgent } from './d3Compliance';
import { d4FinanceRevenueAgent } from './d4FinanceRevenue';
import { d5ClaimsOpsAgent } from './d5ClaimsOps';
import { d6InstitutionSuccessAgent } from './d6InstitutionSuccess';
import { d7ContentLocalizationAgent } from './d7ContentLocalization';
import { d8EngineeringAgent } from './d8Engineering';
import { d9ClinicalGovernanceAgent } from './d9ClinicalGovernance';
import { DepartmentAgent, DepartmentId } from './types';

export * from './types';
export { d1ServiceDeskAgent } from './d1ServiceDesk';
export { d2PartnerOpsAgent } from './d2PartnerOps';
export { d3ComplianceAgent } from './d3Compliance';
export { d4FinanceRevenueAgent } from './d4FinanceRevenue';
export { d5ClaimsOpsAgent } from './d5ClaimsOps';
export { d6InstitutionSuccessAgent } from './d6InstitutionSuccess';
export { d7ContentLocalizationAgent } from './d7ContentLocalization';
export { d8EngineeringAgent } from './d8Engineering';
export { d9ClinicalGovernanceAgent } from './d9ClinicalGovernance';

export const OPERATIONAL_AI_DEPARTMENTS: Record<DepartmentId, DepartmentAgent> = {
  D1: d1ServiceDeskAgent,
  D2: d2PartnerOpsAgent,
  D3: d3ComplianceAgent,
  D4: d4FinanceRevenueAgent,
  D5: d5ClaimsOpsAgent,
  D6: d6InstitutionSuccessAgent,
  D7: d7ContentLocalizationAgent,
  D8: d8EngineeringAgent,
  D9: d9ClinicalGovernanceAgent,
};

export function getDepartmentAgent(id: DepartmentId): DepartmentAgent | undefined {
  return OPERATIONAL_AI_DEPARTMENTS[id];
}
