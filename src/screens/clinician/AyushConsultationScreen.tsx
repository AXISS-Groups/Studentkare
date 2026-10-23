import React from 'react';
import { AgentAyushPanel } from '../workspace/AgentAyushPanel';
import { useT } from '@/i18n';
import '../../theme/workflows.css';

export function AyushConsultationScreen() {
  const t = useT();
  return (
    <div className="wf-container" style={{ padding: '24px', maxWidth: 960, margin: '0 auto' }}>
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow">{t('partner.clin.ayush.eyebrow')}</span>
          <h2>{t('partner.clin.ayush.title')}</h2>
          {/* Used to say "supervised by certified practitioners" — nothing
              records or checks a supervising practitioner. */}
          <p>{t('partner.clin.ayush.intro')}</p>
        </div>
      </div>

      <AgentAyushPanel />
    </div>
  );
}
