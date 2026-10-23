import React, { ReactNode, useEffect, useId, useRef, useState } from 'react';
import { AlertCircle, ArrowLeft, ArrowRight, RefreshCw } from 'lucide-react';
import { CareLoader } from './CareLoader';
import { useT } from '@/i18n';
import { AnimatedIcon, type SkAnimatedName } from '@/design-system/icons';
import { EmptyArt } from '@/design-system/States';
import { color } from '@/design-system/theme';

export function Pagination({
  page,
  total,
  pageSize,
  onChange,
}: {
  page: number;
  total: number;
  pageSize: number;
  onChange: (newPage: number) => void;
}) {
  const t = useT();
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  return (
    <div className="wf-pagination" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginTop: '24px', padding: '12px 0' }}>
      <button
        type="button"
        className="health-button"
        disabled={page === 0}
        onClick={() => onChange(page - 1)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
      >
        <ArrowLeft size={15} aria-hidden="true" /> {t('page.prev')}
      </button>
      <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-2)' }}>
        {t('page.of', { page: page + 1, pages: totalPages, total })}
      </span>
      <button
        type="button"
        className="health-button"
        disabled={(page + 1) >= totalPages}
        onClick={() => onChange(page + 1)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
      >
        {t('page.next')} <ArrowRight size={15} aria-hidden="true" />
      </button>
    </div>
  );
}

export function DataState({ loading, error, retry, children }: { loading: boolean; error: string; retry: () => void; children: ReactNode }) {
  const t = useT();
  if (loading) return <div className="wf-state" role="status"><CareLoader />{t('state.loading')}</div>;
  if (error) return <div className="wf-state wf-state-error" role="alert"><AnimatedIcon name="anim-alert-circle" size="mark" color={color.danger} poster={<AlertCircle size={26} aria-hidden="true" />} /><h3>{t('state.failedTitle')}</h3><p>{error}</p><button className="health-button" onClick={retry}><RefreshCw size={15} aria-hidden="true" />{t('common.tryAgain')}</button></div>;
  return <>{children}</>;
}

/**
 * Console empty state. `animation` picks its art from the animated set (default: a folder on a 3D
 * tile); scenes and chart loops draw as a small illustration, never as data.
 */
export function EmptyState({ title, description, action, onAction, animation = 'anim-folder' }: { title: string; description: string; action?: string; onAction?: () => void; animation?: SkAnimatedName }) {
  return <div className="wf-state wf-empty"><span className="wf-empty-art"><EmptyArt name={animation} /></span><h3>{title}</h3><p>{description}</p>{action && onAction && <button className="health-button" onClick={onAction}>{action}<ArrowRight size={15} /></button>}</div>;
}

export function FormError({ message }: { message: string }) {
  return message ? <div className="care-form-error" role="alert"><AlertCircle size={16} />{message}</div> : null;
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  const generatedId = useId();
  const child = React.isValidElement<{ id?: string; 'aria-describedby'?: string }>(children) ? children : null;
  const id = child?.props.id || generatedId;
  return <div className="wf-field"><label htmlFor={id}>{label}</label>{child ? React.cloneElement(child, { id, 'aria-describedby': [child.props['aria-describedby'], hint ? `${id}-hint` : ''].filter(Boolean).join(' ') || undefined }) : children}{hint && <small id={`${id}-hint`}>{hint}</small>}</div>;
}

export function SubmitButton({ busy, disabled, children }: { busy: boolean; disabled?: boolean; children: ReactNode }) {
  return <button type="submit" className="health-button health-button-primary wf-submit" disabled={busy || disabled} aria-busy={busy}>{busy && <AnimatedIcon name="anim-rotate-cw" size="inline" color="currentColor" poster={<RefreshCw size={15} className="wf-spin" />} />}{children}</button>;
}

export function useMutation() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const mounted = useRef(true);
  const pending = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  async function run<T>(task: () => Promise<T>, done?: (result: T) => void) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true); setError('');
    try { const result = await task(); if (mounted.current) done?.(result); }
    catch (reason) { if (mounted.current) setError(reason instanceof Error ? reason.message : 'The request could not be completed.'); }
    finally { pending.current = false; if (mounted.current) setBusy(false); }
  }
  return { busy, error, run, setError };
}
