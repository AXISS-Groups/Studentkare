import React, { ReactNode, useEffect, useId, useRef, useState } from 'react';
import { AlertCircle, ArrowRight, FolderHeart, RefreshCw } from 'lucide-react';

export function DataState({ loading, error, retry, children }: { loading: boolean; error: string; retry: () => void; children: ReactNode }) {
  if (loading) return <div className="wf-state" role="status"><span className="care-loading-ring" />Loading your information…</div>;
  if (error) return <div className="wf-state wf-state-error" role="alert"><AlertCircle size={26} /><h3>We couldn’t load this yet.</h3><p>{error}</p><button className="health-button" onClick={retry}><RefreshCw size={15} />Try again</button></div>;
  return <>{children}</>;
}

export function EmptyState({ title, description, action, onAction }: { title: string; description: string; action?: string; onAction?: () => void }) {
  return <div className="wf-state wf-empty"><span className="wf-empty-symbol"><FolderHeart size={25} aria-hidden="true" /></span><h3>{title}</h3><p>{description}</p>{action && onAction && <button className="health-button" onClick={onAction}>{action}<ArrowRight size={15} /></button>}</div>;
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
  return <button type="submit" className="health-button health-button-primary wf-submit" disabled={busy || disabled} aria-busy={busy}>{busy && <RefreshCw size={15} className="wf-spin" />}{children}</button>;
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
