import React, { useState } from 'react';
import { EmptyState } from '../../components/interface/WorkflowUI';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import '../../theme/workflows.css';

interface AuditLog {
  id: string;
  category: 'WATER_QUALITY' | 'KITCHEN_HYGIENE' | 'VECTOR_CONTROL';
  location: string;
  inspector: string;
  date: string;
  status: 'PASSED' | 'ACTION_REQUIRED';
  notes: string;
}

export function HostelSanitaryAuditScreen() {
  const t = useT();
  // No audit-log API yet: no invented inspectors or test results.
  const [logs] = useState<AuditLog[]>([]);

  return (
    <div className="wf-container" style={{ padding: '24px', maxWidth: 960, margin: '0 auto' }}>
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow">{t('campus.sanitary.eyebrow')}</span>
          <h2>{t('campus.sanitary.title')}</h2>
          <p>{t('campus.sanitary.lead')}</p>
        </div>
      </div>

      {logs.length === 0 && <EmptyState title={t('campus.sanitary.emptyTitle')} description={t('campus.sanitary.emptyBody')} />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {logs.map(item => (
          <div key={item.id} className="wf-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <span className="care-eyebrow">{t(`campus.sanitary.category.${item.category}` as MessageKey)}</span>
                <h3 style={{ fontSize: 16, marginTop: 4 }}>{item.location}</h3>
                <p style={{ fontSize: 13, color: 'var(--sk-color-text-2)', margin: '4px 0 8px' }}>
                  {t('campus.sanitary.auditedBy', { inspector: item.inspector, date: item.date })}
                </p>
                <p style={{ fontSize: 13 }}>{item.notes}</p>
              </div>

              <span style={{
                fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 999,
                background: item.status === 'PASSED' ? 'var(--sk-color-positive-bg)' : 'var(--sk-color-danger-bg)',
                color: item.status === 'PASSED' ? 'var(--sk-color-positive)' : 'var(--sk-color-danger)'
              }}>
                {t(`campus.sanitary.status.${item.status}` as MessageKey)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
