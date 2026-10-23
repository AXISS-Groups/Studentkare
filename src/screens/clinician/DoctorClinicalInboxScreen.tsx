import React, { useState } from 'react';
import { Inbox, AlertTriangle, Pill } from 'lucide-react';
import { EmptyState } from '../../components/interface/WorkflowUI';
import { ClinicalReviewPanel } from '../workspace/ClinicalReviewPanel';
import { useT } from '@/i18n';
import '../../theme/workflows.css';

export function DoctorClinicalInboxScreen() {
  const t = useT();
  const [activeTab, setActiveTab] = useState<'all' | 'critical' | 'substitutions'>('all');

  return (
    <div className="wf-container" style={{ padding: '24px', maxWidth: 1000, margin: '0 auto' }}>
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow">{t('partner.clin.inbox.eyebrow')}</span>
          <h2>{t('partner.clin.inbox.title')}</h2>
          <p>{t('partner.clin.inbox.intro')}</p>
        </div>
      </div>

      <div className="wf-card" style={{ padding: 16, marginBottom: 20, display: 'flex', gap: 12 }}>
        <button
          type="button"
          aria-pressed={activeTab === 'all'}
          className={`health-button ${activeTab === 'all' ? 'health-button-primary' : ''}`}
          style={{ minHeight: 44 }}
          onClick={() => setActiveTab('all')}
        >
          <Inbox size={16} aria-hidden="true" /> {t('partner.clin.inbox.tabAll')}
        </button>
        <button
          type="button"
          aria-pressed={activeTab === 'critical'}
          className={`health-button ${activeTab === 'critical' ? 'health-button-primary' : ''}`}
          style={{ minHeight: 44 }}
          onClick={() => setActiveTab('critical')}
        >
          <AlertTriangle size={16} aria-hidden="true" color="var(--sk-color-danger)" /> {t('partner.clin.inbox.tabCritical')}
        </button>
        <button
          type="button"
          aria-pressed={activeTab === 'substitutions'}
          className={`health-button ${activeTab === 'substitutions' ? 'health-button-primary' : ''}`}
          style={{ minHeight: 44 }}
          onClick={() => setActiveTab('substitutions')}
        >
          <Pill size={16} aria-hidden="true" /> {t('partner.clin.inbox.tabSwaps')}
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        {/* No critical-value feed reaches this inbox yet. It used to show an
            invented student with an invented panic value; absence is shown
            as absence. */}
        <EmptyState title={t('partner.clin.inbox.emptyTitle')} description={t('partner.clin.inbox.emptyBody')} animation="anim-inbox" />
      </div>

      <ClinicalReviewPanel />
    </div>
  );
}
