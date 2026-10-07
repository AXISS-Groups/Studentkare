import { apiRequest } from '@/data/http';
import type { PlanCatalog } from '@/data/datasets/billing';
import type { ContractList, InquiryList, NewContract } from './types';

/**
 * Institutional billing for Super Admin: inquiries and contracts. The only place that
 * knows the admin billing endpoints. The record types come from data/datasets/billing.ts.
 */
export interface ContractsRepository {
  inquiries(signal?: AbortSignal): Promise<InquiryList>;
  contracts(signal?: AbortSignal): Promise<ContractList>;
  setInquiryStatus(inquiryId: string, status: string): Promise<unknown>;
  createContract(contract: NewContract): Promise<unknown>;
}

/** The published plan catalogue, on the same billing repository (Overview). */
export interface PlansRepository {
  plans(signal?: AbortSignal): Promise<PlanCatalog>;
}

export const contractsRepository: ContractsRepository & PlansRepository = {
  inquiries: signal => apiRequest<InquiryList>('/billing/admin/inquiries', { signal }),
  contracts: signal => apiRequest<ContractList>('/billing/contracts', { signal }),
  setInquiryStatus: (inquiryId, status) => apiRequest(`/billing/admin/inquiries/${inquiryId}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  createContract: contract => apiRequest('/billing/admin/contracts', { method: 'POST', body: JSON.stringify(contract) }),
  plans: signal => apiRequest<PlanCatalog>('/billing/plans', { signal }),
};
