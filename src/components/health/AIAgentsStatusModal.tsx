import React from 'react';
import { Bot, RefreshCw, X } from 'lucide-react';
import { useApiResource } from '../../hooks/useApiResource';
import { useT } from '../../i18n';
import '../../theme/workflows.css';

export interface AIAgentsStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/** GET /agents/live-status: derived from the durable job schedule and recorded runs. */
interface AgentStatus {
  key: string;
  name: string;
  status: string;
  intervalSeconds: number;
  lastRunAt: number | null;
  lastStatus: string;
}

/**
 * Background agents and their real schedule. Only what the server reports is
 * shown: if the status cannot be loaded the modal says so and offers a retry,
 * never a made-up list of agents.
 */
export function AIAgentsStatusModal({ isOpen, onClose }: AIAgentsStatusModalProps) {
  const t = useT();
  const status = useApiResource<{ agents: AgentStatus[] }>(isOpen ? '/agents/live-status' : null);
  if (!isOpen) return null;

  const cadence = (seconds: number) => seconds < 3600
    ? t('admin.telemetry.everySeconds', { seconds })
    : t('admin.telemetry.every', { hours: Math.round(seconds / 3600) });
  const agents = status.data?.agents ?? [];

  return (
    <div className="wf-modal-backdrop" onClick={onClose}>
      <div className="wf-modal-card" role="dialog" aria-modal="true" aria-labelledby="agents-status-title" style={{ maxWidth: 680 }} onClick={e => e.stopPropagation()}>
        <button type="button" aria-label={t('admin.agents.close')} className="wf-modal-close" style={{ minWidth: 44, minHeight: 44 }} onClick={onClose}>
          <X size={18} aria-hidden="true" />
        </button>

        <div className="wf-panel-heading"><div>
          <span className="wf-record-icon"><Bot size={24} aria-hidden="true" /></span>
          <h3 id="agents-status-title">{t('admin.agents.title')}</h3>
          <p>{t('admin.agents.intro')}</p>
        </div></div>

        {status.loading && <div className="wf-state" role="status">{t('state.loading')}</div>}
        {!status.loading && status.error && (
          <div className="wf-state wf-state-error" role="alert">
            <p>{t('admin.agents.loadError')}</p>
            <button type="button" className="health-button" style={{ minHeight: 44 }} onClick={status.reload}>
              <RefreshCw size={15} aria-hidden="true" />{t('common.tryAgain')}
            </button>
          </div>
        )}
        {!status.loading && !status.error && status.data && (agents.length
          ? <div className="wf-order-list">{agents.map(agent => (
            <div className="wf-order-line" key={agent.key}>
              <div>
                <strong>{agent.name}</strong>
                <small>{cadence(agent.intervalSeconds)} · {t('admin.telemetry.last', { when: agent.lastRunAt ? new Date(agent.lastRunAt * 1000).toLocaleString() : t('admin.telemetry.never') })}</small>
              </div>
              <span className={`wf-status ${agent.status === 'OPERATIONAL' ? 'status-accepted' : agent.status === 'FAILED' ? 'status-declined' : 'status-requested'}`}>{agent.status}</span>
            </div>
          ))}</div>
          : <div className="wf-state wf-empty"><p>{t('admin.agents.empty')}</p></div>)}

        <button type="button" className="health-button health-button-primary" style={{ marginTop: 16, minHeight: 44 }} onClick={onClose}>
          {t('admin.agents.close')}
        </button>
      </div>
    </div>
  );
}
