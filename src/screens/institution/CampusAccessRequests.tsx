import React, { useState, useEffect } from 'react';
import { AlertCircle, ArrowRight, Info, Lock, WifiOff } from 'lucide-react';
import { Field, SubmitButton, useMutation } from '../../components/interface/WorkflowUI';
import { useT } from '@/i18n';

/**
 * Campus request for a student's consent to view clinical records.
 *
 * No consent-request endpoint exists yet, so this fails closed: submitting
 * always reports that nothing was sent. It used to carry its own en/te/hi
 * table and language toggle, a simulated 600 ms "loading" state, and a
 * "Request Sent" success panel; the language now comes from the app, and the
 * fake load and the unreachable success panel are gone.
 */
export function CampusAccessRequests() {
  const t = useT();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  const [student, setStudent] = useState('');
  const [purpose, setPurpose] = useState('');
  const [duration, setDuration] = useState('24');

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
    if (!student.trim() || !purpose.trim()) {
      setError(t('campus.access.required'));
      return;
    }

    void run(async () => {
      // Fail closed: no consent-request endpoint exists yet, so never report a
      // request as sent, and never write the student identifier to the console.
      throw new Error(t('campus.access.unavailable'));
    });
  };

  if (isOffline) {
    return (
      <div style={{ padding: 'var(--sk-space-20)', backgroundColor: 'var(--sk-color-canvas)', minHeight: '100vh' }}>
        <div role="status" style={{ backgroundColor: 'var(--sk-color-danger-bg)', padding: 'var(--sk-space-16)', borderRadius: 'var(--sk-radius-md)', display: 'flex', alignItems: 'center', gap: 'var(--sk-space-12)' }}>
          <WifiOff color="var(--sk-color-danger)" size={24} aria-hidden="true" />
          <p style={{ margin: 0, color: 'var(--sk-color-danger)', fontWeight: 500, fontSize: 'var(--sk-text-body)' }}>{t('campus.access.offline')}</p>
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
          <Lock color="var(--sk-color-action)" size={32} aria-hidden="true" />
          <div>
            <h1 style={{ margin: 0, fontSize: 'var(--sk-text-heading)', color: 'var(--sk-color-text)' }}>{t('campus.access.title')}</h1>
            <p style={{ margin: 'var(--sk-space-4) 0 0 0', fontSize: 'var(--sk-text-body)', color: 'var(--sk-color-text-2)' }}>{t('campus.access.subtitle')}</p>
          </div>
        </div>

        <div role="note" style={{ backgroundColor: 'var(--sk-color-attention-bg)', padding: 'var(--sk-space-12)', borderRadius: 'var(--sk-radius-sm)', display: 'flex', alignItems: 'flex-start', gap: 'var(--sk-space-8)', color: 'var(--sk-color-text)', marginBottom: 'var(--sk-space-20)' }}>
          <Info size={20} color="var(--sk-color-attention)" aria-hidden="true" />
          <span style={{ fontSize: 'var(--sk-text-body-sm)' }}>{t('campus.access.unavailableNote')}</span>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sk-space-20)' }}>

          {error && (
            <div role="alert" style={{ backgroundColor: 'var(--sk-color-danger-bg)', padding: 'var(--sk-space-12)', borderRadius: 'var(--sk-radius-sm)', display: 'flex', alignItems: 'center', gap: 'var(--sk-space-8)', color: 'var(--sk-color-danger)' }}>
              <AlertCircle size={20} aria-hidden="true" />
              <span style={{ fontSize: 'var(--sk-text-body-sm)' }}>{error}</span>
            </div>
          )}

          <Field label={t('campus.access.student')}>
            <input
              type="text"
              value={student}
              onChange={e => setStudent(e.target.value)}
              disabled={busy}
              aria-required="true"
              style={{
                width: '100%',
                padding: 'var(--sk-space-12)',
                borderRadius: 'var(--sk-radius-md)',
                border: '1px solid var(--sk-color-rule-strong)',
                fontSize: 'var(--sk-text-body)',
                color: 'var(--sk-color-text)',
                backgroundColor: 'var(--sk-color-surface)',
                minHeight: 'var(--sk-size-control)'
              }}
            />
          </Field>

          <Field label={t('campus.access.purpose')}>
            <textarea
              value={purpose}
              onChange={e => setPurpose(e.target.value)}
              disabled={busy}
              rows={2}
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

          <Field label={t('campus.access.duration')}>
            <select
              value={duration}
              onChange={e => setDuration(e.target.value)}
              disabled={busy}
              aria-required="true"
              style={{
                width: '100%',
                padding: 'var(--sk-space-12)',
                borderRadius: 'var(--sk-radius-md)',
                border: '1px solid var(--sk-color-rule-strong)',
                fontSize: 'var(--sk-text-body)',
                color: 'var(--sk-color-text)',
                backgroundColor: 'var(--sk-color-surface)',
                minHeight: 'var(--sk-size-control)'
              }}
            >
              <option value="12">{t('campus.access.hours', { count: 12 })}</option>
              <option value="24">{t('campus.access.hours', { count: 24 })}</option>
              <option value="72">{t('campus.access.hours', { count: 72 })}</option>
            </select>
          </Field>

          <div style={{ marginTop: 'var(--sk-space-8)' }}>
            <SubmitButton busy={busy} disabled={!student.trim() || !purpose.trim()}>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--sk-space-8)', width: '100%', minHeight: 'var(--sk-size-control-lg)', fontSize: 'var(--sk-text-title-sm)', backgroundColor: 'var(--sk-color-action)', color: 'var(--sk-color-on-action)', borderRadius: 'var(--sk-radius-lg)', border: 'none', cursor: (!student.trim() || !purpose.trim() || busy) ? 'not-allowed' : 'pointer', opacity: (!student.trim() || !purpose.trim() || busy) ? 0.6 : 1 }}>
                {t('campus.access.submit')}
                <ArrowRight size={20} aria-hidden="true" />
              </span>
            </SubmitButton>
          </div>

        </form>
      </div>
    </div>
  );
}
