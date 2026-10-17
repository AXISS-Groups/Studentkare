import React from 'react';
import { EmptyState } from '../../components/interface/WorkflowUI';
import { useT } from '@/i18n';
import '../../theme/workflows.css';

export function CampusHealthScorecardScreen() {
  const t = useT();
  return (
    <div className="wf-container" style={{ padding: '24px', maxWidth: 960, margin: '0 auto' }}>
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow">{t('campus.scorecard.eyebrow')}</span>
          <h2>{t('campus.scorecard.title')}</h2>
          <p>{t('campus.scorecard.lead')}</p>
        </div>
      </div>

      {/* No scorecard data source exists yet. A grade, coverage % or SLA is never
          shown unless it is computed from recorded evidence (AGENTS.md guardrail 6). */}
      <EmptyState title={t('campus.scorecard.emptyTitle')} description={t('campus.scorecard.emptyBody')} />
    </div>
  );
}
