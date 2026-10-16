import React, { useState, useEffect } from 'react';
import { AlertCircle, ArrowRight, Info, ShieldAlert, WifiOff, Users } from 'lucide-react';
import { Field, SubmitButton, useMutation } from '../../components/interface/WorkflowUI';
import { useT } from '@/i18n';

/**
 * Emergency break-glass access to a student's records.
 *
 * No break-glass endpoint exists yet, so this fails closed (AGENTS.md
 * guardrail 1): submitting always reports that no access was granted, and a
 * notice says so before anyone fills the form in an emergency. It used to carry
 * its own en/te/hi table and language toggle, a simulated 600 ms "loading"
 * state, and an "Emergency Access Granted — Audit logged and student notified"
 * panel; the language now comes from the app, and the fake load and the
 * unreachable success panel are gone.
 */
export function CampusBreakGlass() {
  const t = useT();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  const [reason, setReason] = useState('');
  const [authorizer, setAuthorizer] = useState('');

  const { busy, error, run, setError } = useMutation();

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim() || !authorizer.trim()) {
      setError(t('campus.breakGlass.required'));
      return;
    }

    void run(async () => {
      // Fail closed (AGENTS.md guardrail 1): no break-glass endpoint exists yet, so
      // never report access as granted. Nothing is written to the console (guardrail 9).
      throw new Error(t('campus.breakGlass.unavailable'));
    });
  };

  if (isOffline) {
    return (
      <div style={{ padding: 'var(--sk-space-20)', backgroundColor: 'var(--sk-color-canvas)', minHeight: '100vh' }}>
        <div role="status" style={{ backgroundColor: 'var(--sk-color-danger-bg)', padding: 'var(--sk-space-16)', borderRadius: 'var(--sk-radius-md)', display: 'flex', alignItems: 'center', gap: 'var(--sk-space-12)' }}>
          <WifiOff color="var(--sk-color-danger)" size={24} aria-hidden="true" />
          <p style={{ margin: 0, color: 'var(--sk-color-danger)', fontWeight: 500, fontSize: 'var(--sk-text-body)' }}>
            {t('campus.breakGlass.offline')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 'var(--sk-space-gutter-phone)', backgroundColor: 'var(--sk-color-canvas)', minHeight: '100vh', maxWidth: 'var(--sk-size-web-content-max)', margin: '0 auto' }}>
      <div style={{
        backgroundColor: 'var(--sk-color-surface)',
        borderRadius: 'var(--sk-radius-xl)',
        padding: 'var(--sk-space-24)',
        boxShadow: 'var(--sk-shadow-card)',
        maxWidth: '600px',
        margin: '0 auto'
      }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sk-space-12)', marginBottom: 'var(--sk-space-24)' }}>
          <ShieldAlert color="var(--sk-color-danger)" size={32} aria-hidden="true" />
          <div>
            <h1 style={{ margin: 0, fontSize: 'var(--sk-text-heading)', color: 'var(--sk-color-danger)' }}>
              {t('campus.breakGlass.title')}
            </h1>
            <p style={{ margin: 'var(--sk-space-4) 0 0 0', fontSize: 'var(--sk-text-body)', color: 'var(--sk-color-text-2)' }}>
              {t('campus.breakGlass.subtitle')}
            </p>
          </div>
        </div>

        <div role="note" style={{ backgroundColor: 'var(--sk-color-attention-bg)', padding: 'var(--sk-space-12)', borderRadius: 'var(--sk-radius-sm)', display: 'flex', alignItems: 'flex-start', gap: 'var(--sk-space-8)', color: 'var(--sk-color-text)', marginBottom: 'var(--sk-space-20)' }}>
          <Info size={20} color="var(--sk-color-attention)" aria-hidden="true" />
          <span style={{ fontSize: 'var(--sk-text-body-sm)' }}>{t('campus.breakGlass.unavailableNote')}</span>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sk-space-20)' }}>

          {error && (
            <div role="alert" style={{ backgroundColor: 'var(--sk-color-danger-bg)', padding: 'var(--sk-space-12)', borderRadius: 'var(--sk-radius-sm)', display: 'flex', alignItems: 'center', gap: 'var(--sk-space-8)', color: 'var(--sk-color-danger)' }}>
              <AlertCircle size={20} aria-hidden="true" />
              <span style={{ fontSize: 'var(--sk-text-body-sm)' }}>{error}</span>
            </div>
          )}

          <Field label={t('campus.breakGlass.reason')} hint={t('campus.breakGlass.reasonHint')}>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              disabled={busy}
              rows={3}
              aria-required="true"
              style={{
                width: '100%',
                padding: 'var(--sk-space-12)',
                borderRadius: 'var(--sk-radius-md)',
                border: '1px solid var(--sk-color-rule-strong)',
                fontSize: 'var(--sk-text-body)',
                color: 'var(--sk-color-text)',
                backgroundColor: 'var(--sk-color-surface)',
                resize: 'vertical',
                minHeight: 'var(--sk-size-touch-target)'
              }}
            />
          </Field>

          <Field label={t('campus.breakGlass.authorizer')} hint={t('campus.breakGlass.authorizerHint')}>
            <div style={{ position: 'relative' }}>
              <Users color="var(--sk-color-text-3)" size={20} style={{ position: 'absolute', left: 'var(--sk-space-12)', top: '15px' }} aria-hidden="true" />
              <input
                type="text"
                aria-label={t('campus.breakGlass.authorizer')}
                value={authorizer}
                onChange={e => setAuthorizer(e.target.value)}
                disabled={busy}
                aria-required="true"
                style={{
                  width: '100%',
                  padding: 'var(--sk-space-12) var(--sk-space-12) var(--sk-space-12) 44px',
                  borderRadius: 'var(--sk-radius-md)',
                  border: '1px solid var(--sk-color-rule-strong)',
                  fontSize: 'var(--sk-text-body)',
                  color: 'var(--sk-color-text)',
                  backgroundColor: 'var(--sk-color-surface)',
                  minHeight: 'var(--sk-size-control)'
                }}
              />
            </div>
          </Field>

          <div style={{ marginTop: 'var(--sk-space-8)' }}>
            <SubmitButton busy={busy} disabled={!reason.trim() || !authorizer.trim()}>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--sk-space-8)', width: '100%', minHeight: 'var(--sk-size-control-lg)', fontSize: 'var(--sk-text-title-sm)', backgroundColor: 'var(--sk-color-danger-fill)', color: 'var(--sk-color-on-action)', borderRadius: 'var(--sk-radius-lg)', border: 'none', cursor: (!reason.trim() || !authorizer.trim() || busy) ? 'not-allowed' : 'pointer', opacity: (!reason.trim() || !authorizer.trim() || busy) ? 0.6 : 1 }}>
                {t('campus.breakGlass.submit')}
                <ArrowRight size={20} aria-hidden="true" />
              </span>
            </SubmitButton>
          </div>

        </form>
      </div>
    </div>
  );
}
