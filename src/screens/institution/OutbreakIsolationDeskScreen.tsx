import React, { useState } from 'react';
import { ShieldAlert, Bed } from 'lucide-react';
import { EmptyState } from '../../components/interface/WorkflowUI';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import '../../theme/workflows.css';

interface IsolatedStudent {
  id: string;
  studentName: string;
  roomNo: string;
  condition: string;
  isolatedDate: string;
  temp: string;
  mealStatus: 'DELIVERED' | 'PENDING';
}

export function OutbreakIsolationDeskScreen() {
  const t = useT();
  // No isolation records API exists yet, so the roster starts empty rather than
  // showing invented students (DESIGN.md §2 — honest states).
  const [isolations, setIsolations] = useState<IsolatedStudent[]>([]);

  return (
    <div className="wf-container" style={{ padding: '24px', maxWidth: 960, margin: '0 auto' }}>
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow">{t('campus.isolation.eyebrow')}</span>
          <h2>{t('campus.isolation.title')}</h2>
          <p>{t('campus.isolation.lead')}</p>
        </div>
      </div>

      <div className="wf-card" style={{ padding: 20, marginBottom: 20, borderLeft: '4px solid var(--sk-color-danger)' }}>
        <h3 style={{ fontSize: 16, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--sk-color-danger)' }}>
          <ShieldAlert size={20} aria-hidden="true" /> {t('campus.isolation.statusTitle')}
        </h3>
        {/* With no records source, zero is "unknown", not "nobody is isolated". */}
        <p style={{ fontSize: 13, color: 'var(--sk-color-text-2)', margin: '4px 0 0' }}>
          {isolations.length === 0 ? t('campus.isolation.noneRecorded') : t('campus.isolation.countRecorded', { count: isolations.length })}
        </p>
      </div>

      <div className="wf-card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Bed size={18} aria-hidden="true" /> {t('campus.isolation.rosterTitle', { count: isolations.length })}
        </h3>

        {isolations.length === 0 && <EmptyState title={t('campus.isolation.emptyTitle')} description={t('campus.isolation.emptyBody')} />}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {isolations.map(item => (
            <div key={item.id} style={{ border: '1px solid var(--sk-color-rule)', borderRadius: 10, padding: 16, background: 'var(--sk-color-surface)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <strong style={{ fontSize: 15 }}>{item.studentName}</strong> — <code>{item.roomNo}</code>
                  <p style={{ fontSize: 13, color: 'var(--sk-color-text-2)', margin: '2px 0' }}>
                    {t('campus.isolation.condition')} <strong>{item.condition}</strong> · {t('campus.isolation.since')} {item.isolatedDate} · {t('campus.isolation.temp')} <strong>{item.temp}</strong>
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 999,
                    background: item.mealStatus === 'DELIVERED' ? 'var(--sk-color-positive-bg)' : 'var(--sk-color-attention-bg)',
                    color: item.mealStatus === 'DELIVERED' ? 'var(--sk-color-positive)' : 'var(--sk-color-attention)'
                  }}>
                    {t('campus.isolation.meal', { status: t(`campus.isolation.meal.${item.mealStatus}` as MessageKey) })}
                  </span>
                  <button
                    type="button"
                    className="health-button"
                    style={{ minHeight: 44, fontSize: 12 }}
                    onClick={() => {
                      setIsolations(isolations.map(i => i.id === item.id ? { ...i, mealStatus: 'DELIVERED' } : i));
                    }}
                  >
                    {t('campus.isolation.markDelivered')}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
