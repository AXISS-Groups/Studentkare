import React from 'react';
import { EmptyState } from '../interface/WorkflowUI';
import { useT } from '@/i18n';
import '../../theme/workflows.css';

/**
 * No symptom-telemetry feed is connected, so this shows only that fact.
 *
 * It used to render per-block fever / gastro / respiratory counts from an
 * always-empty local state. Those counts were shown down to 1 — a block with
 * one fever case names a student to anyone who knows the block — and a
 * "Dispatch Water & Kitchen Audit Task" button flipped to "Dispatched" without
 * sending anything. When a real source exists, counts below the suppression
 * threshold must be withheld server-side before they reach this component.
 */
export function HostelOutbreakEarlyWarningRadar() {
  const t = useT();

  return (
    <div className="wf-card" style={{ padding: 24 }}>
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow">{t('campus.hostelRadar.eyebrow')}</span>
          <h2>{t('campus.hostelRadar.title')}</h2>
          <p>{t('campus.hostelRadar.lead')}</p>
        </div>
      </div>

      <EmptyState title={t('campus.radar.noSourceTitle')} description={t('campus.radar.noSourceBody')} />
    </div>
  );
}
