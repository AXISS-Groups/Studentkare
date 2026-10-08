import { apiRequest } from '@/data/http';
import type { AccountRole } from '@/data/workflowTypes';
import type { AccountList, AccountListQuery, AccountPage, NewStaffAccount } from './types';

/** Accounts for Super Admin. The only place that knows the /ops/accounts endpoints. */
export interface AccountsRepository {
  /** How many accounts hold a role, read as a one-item page. */
  countByRole(role: AccountRole, signal?: AbortSignal): Promise<AccountPage>;
  list(query: AccountListQuery, signal?: AbortSignal): Promise<AccountPage>;
  /** Every account, unfiltered (/ops/accounts), as the provider choices on Catalogue ops need. */
  listAll(signal?: AbortSignal): Promise<AccountList>;
  create(account: NewStaffAccount): Promise<unknown>;
  /** Set the campus a campus administrator acts for (PATCH /ops/accounts/{id}/campus). */
  setCampus(accountId: string, university: string): Promise<unknown>;
}

/** /ops/accounts?limit=…&offset=…[&query=…][&role=…] */
const listPath = ({ limit, offset, query, role }: AccountListQuery) =>
  `/ops/accounts?limit=${limit}&offset=${offset}${query ? `&query=${encodeURIComponent(query)}` : ''}${role ? `&role=${role}` : ''}`;

export const accountsRepository: AccountsRepository = {
  countByRole: (role, signal) => apiRequest<AccountPage>(`/ops/accounts?limit=1&role=${role}`, { signal }),
  list: (query, signal) => apiRequest<AccountPage>(listPath(query), { signal }),
  listAll: signal => apiRequest<AccountList>('/ops/accounts', { signal }),
  create: account => apiRequest('/ops/accounts', { method: 'POST', body: JSON.stringify(account) }),
  setCampus: (accountId, university) => apiRequest(`/ops/accounts/${encodeURIComponent(accountId)}/campus`, { method: 'PATCH', body: JSON.stringify({ university }) }),
};
