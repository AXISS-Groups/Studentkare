import React from 'react';
import { useT } from '@/i18n';
import { ShieldAlert, ArrowRight, X } from 'lucide-react';
import { CrisisLinks } from '@/design-system';
import './auth-form.css';

interface VerifyGateViewProps {
  onClose?: () => void;
  serviceName?: string;
}

export function VerifyGateView({ onClose }: VerifyGateViewProps): React.ReactElement {
  const t = useT();
  return (
    <div style={{ minHeight: '100vh', background: 'rgba(19, 27, 46, 0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', boxSizing: 'border-box' }}>
      <div style={{ width: '100%', maxWidth: '520px', background: 'var(--sk-color-surface)', borderRadius: '24px', padding: '36px', boxShadow: '0 24px 60px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative' }}>
        {onClose && (
          <button
            type="button"
            aria-label={t('common.back')}
            onClick={onClose}
            style={{ position: 'absolute', top: '20px', right: '20px', border: 0, background: 'transparent', cursor: 'pointer', color: 'var(--sk-color-text-3)' }}
          >
            <X size={20} />
          </button>
        )}

        <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'var(--sk-color-surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sk-color-action)' }}>
          <ShieldAlert size={28} />
        </div>

        <div>
          <span style={{ fontSize: '11.5px', fontWeight: 800, letterSpacing: '1.2px', color: 'var(--sk-color-action)' }}>{t('gate.eyebrow').toUpperCase()}</span>
          <h1 style={{ margin: '6px 0 8px', fontSize: '26px', fontWeight: 800, color: 'var(--sk-color-text)', letterSpacing: '-0.6px' }}>
            {t('gate.title')}
          </h1>
          <p style={{ margin: 0, fontSize: '14.5px', lineHeight: 1.6, color: 'var(--sk-color-text-2)' }}>
            {t('gate.body')}
          </p>
        </div>

        <div style={{ padding: '16px', borderRadius: '14px', background: 'var(--sk-color-surface-2)', border: '1px solid var(--sk-color-rule-soft)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--sk-color-text)' }}>{t('gate.needed')}</span>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: 'var(--sk-color-text-2)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <li>{t('gate.item')}</li>
          </ul>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              style={{ flex: 1, height: '50px', borderRadius: '13px', border: '1px solid var(--sk-color-rule)', background: 'var(--sk-color-surface)', fontSize: '14.5px', fontWeight: 700, color: 'var(--sk-color-text-2)', cursor: 'pointer' }}
            >
              {t('gate.notNow')}
            </button>
          )}
          <a
            href="/verify"
            style={{
              flex: 2,
              height: '50px',
              borderRadius: '13px',
              background: 'var(--sk-color-action)',
              color: 'var(--sk-color-on-action)',
              fontSize: '14.5px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              textDecoration: 'none',
            }}
          >
            {t('gate.start')} <ArrowRight size={16} />
          </a>
        </div>

        <CrisisLinks titleKey="crisis.noVerify" testID="crisis-links" />
      </div>
    </div>
  );
}
