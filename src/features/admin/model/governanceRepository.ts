import { apiRequest } from '@/data/services/http';
import type { ApiLayerStatus, ErasureQueue, RuleLStatus, SettingHistory, SettingList, SettingView, SosList } from './governanceTypes';

/**
 * The super admin governance, safety and money boards (WP-17). The only place that
 * knows /ops/sos, /ops/rule-l, /ops/erasure, /apilayer/status and /ops/settings.
 * Every endpoint is behind the super admin session (and its 2FA) on the server.
 */
export interface GovernanceRepository {
  /** Every recent SOS, open and closed, across campuses (super admin is not campus-scoped). */
  sosAlerts(signal?: AbortSignal): Promise<SosList>;
  ruleL(signal?: AbortSignal): Promise<RuleLStatus>;
  erasureQueue(signal?: AbortSignal): Promise<ErasureQueue>;
  /** Opens a sealed archive. The reason is required and audited; the server announces it on the ops feed. */
  openErasureArchive(archiveId: string, reason: string): Promise<{ archive: unknown }>;
  apiLayer(signal?: AbortSignal): Promise<ApiLayerStatus>;
  settings(signal?: AbortSignal): Promise<SettingList>;
  settingHistory(key: string, signal?: AbortSignal): Promise<SettingHistory>;
  /** Validated, reason required, audited and kept in history by the server. */
  changeSetting(key: string, value: number, reason: string): Promise<SettingView>;
}

export const governanceRepository: GovernanceRepository = {
  sosAlerts: signal => apiRequest<SosList>('/ops/sos?open=false', { signal }),
  ruleL: signal => apiRequest<RuleLStatus>('/ops/rule-l', { signal }),
  erasureQueue: signal => apiRequest<ErasureQueue>('/ops/erasure', { signal }),
  openErasureArchive: (archiveId, reason) => apiRequest<{ archive: unknown }>(`/ops/erasure/archives/${encodeURIComponent(archiveId)}/open`, { method: 'POST', body: JSON.stringify({ reason }) }),
  apiLayer: signal => apiRequest<ApiLayerStatus>('/apilayer/status', { signal }),
  settings: signal => apiRequest<SettingList>('/ops/settings', { signal }),
  settingHistory: (key, signal) => apiRequest<SettingHistory>(`/ops/settings/${encodeURIComponent(key)}/history`, { signal }),
  changeSetting: (key, value, reason) => apiRequest<SettingView>(`/ops/settings/${encodeURIComponent(key)}`, { method: 'PATCH', body: JSON.stringify({ value, reason }) }),
};
