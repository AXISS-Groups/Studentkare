import React, { useEffect, useRef, useState } from 'react';
import { FileText, ShoppingCart, X } from 'lucide-react';
import { useAuth } from '../../data/AuthContext';
import { apiRequest } from '../../data/http';
import { navigate } from '../../lib/workflowRouting';
import { say, useT, type Said } from '@/i18n';
import '../../theme/workflows.css';

export interface ExtractedRxItem {
  raw_name?: string;
  matched_catalog_id?: string;
  matched_catalog_name?: string;
  source_span?: string;
  dosage?: string;
  frequency?: string;
}

export interface RxCartOutcome {
  acceptedIndexes: number[];
  blocked: { index: number; reason: string }[];
}

export interface PrescriptionUploaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddToCart?: (items: ExtractedRxItem[], signal: AbortSignal) => Promise<RxCartOutcome>;
  token?: string | null;
}

export function PrescriptionUploaderModal(props: PrescriptionUploaderModalProps) {
  const { user } = useAuth();
  if (!props.isOpen) return null;
  // Closing or changing accounts discards sensitive drafts and in-flight results.
  return <PrescriptionUploadSession key={user?.id || 'guest'} {...props} signedIn={!!user} />;
}

function PrescriptionUploadSession({ onClose, onAddToCart, signedIn }: PrescriptionUploaderModalProps & { signedIn: boolean }) {
  const t = useT();
  const [rxText, setRxText] = useState('');
  const [items, setItems] = useState<ExtractedRxItem[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Said | null>(null);
  const [outcome, setOutcome] = useState<RxCartOutcome | null>(null);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  const close = () => { request.current?.abort(); onClose(); };

  const handleAnalyze = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!signedIn || !rxText.trim() || request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError(null);
    setItems(null);
    setOutcome(null);
    try {
      const result = await apiRequest<{ extracted_items: ExtractedRxItem[] }>('/rx/extract-ai', {
        method: 'POST', body: JSON.stringify({ prescriptionText: rxText.trim() }), signal: controller.signal,
      });
      if (!Array.isArray(result?.extracted_items) || result.extracted_items.some(item =>
        !item || typeof item !== 'object' || Array.isArray(item) ||
        ['raw_name', 'matched_catalog_id', 'matched_catalog_name', 'source_span', 'dosage', 'frequency'].some(key =>
          item[key as keyof ExtractedRxItem] != null && typeof item[key as keyof ExtractedRxItem] !== 'string'))) {
        if (!controller.signal.aborted) setError({ key: 'care.rxUpload.invalid' });
        return;
      }
      if (!controller.signal.aborted) setItems(result.extracted_items);
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error && cause.message ? { raw: cause.message } : { key: 'care.rxUpload.extractFailed' });
    } finally {
      if (!controller.signal.aborted) { setBusy(false); request.current = null; }
    }
  };

  const handleAddToCart = async () => {
    if (!items || !onAddToCart || outcome || request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError(null);
    try {
      const result = await onAddToCart(items, controller.signal);
      if (!controller.signal.aborted) setOutcome(result);
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error && cause.message ? { raw: cause.message } : { key: 'care.rxUpload.cartFailed' });
    } finally {
      if (!controller.signal.aborted) { setBusy(false); request.current = null; }
    }
  };

  return <div className="wf-modal-backdrop" onClick={close}>
    <div className="wf-modal-card" role="dialog" aria-modal="true" aria-labelledby="rx-modal-title" style={{ maxWidth: 620 }} onClick={event => event.stopPropagation()}>
      <button type="button" className="wf-modal-close" onClick={close} aria-label={t('care.close')}><X size={18} aria-hidden="true" /></button>
      <div className="wf-modal-header">
        <h3 id="rx-modal-title"><FileText size={22} aria-hidden="true" /> {t('care.rxUpload.title')}</h3>
        <p>{t('care.rxUpload.intro')}</p>
      </div>
      {error && <div className="wf-notice" role="alert">{say(t, error)}</div>}
      {!signedIn ? <>
        <p>{t('care.rxUpload.signInPrompt')}</p>
        <button type="button" className="health-button health-button-primary" onClick={() => { close(); navigate('login', 'shop'); }}>{t('care.signIn')}</button>
      </> : items === null ? <form className="wf-form" onSubmit={handleAnalyze}>
        <label htmlFor="rx-source-text">{t('care.rxUpload.textLabel')}</label>
        <textarea id="rx-source-text" rows={6} value={rxText} onChange={event => setRxText(event.target.value)} disabled={busy} required maxLength={20000} />
        <p className="wf-fineprint">{t('care.rxUpload.textOnly')}</p>
        <button className="health-button" type="button" onClick={() => { close(); navigate('records'); }}>{t('care.rxUpload.openRecords')}</button>
        <button className="health-button health-button-primary" type="submit" disabled={busy || !rxText.trim()}>{busy ? t('care.rxUpload.checking') : t('care.rxUpload.find')}</button>
      </form> : <div className="wf-form">
        <p>{t('care.rxUpload.entries', { count: items.length })}</p>
        {outcome && <div className="wf-notice" role="status">{t('care.rxUpload.outcome', { added: outcome.acceptedIndexes.length, blocked: outcome.blocked.length })}</div>}
        {!items.length && <p>{t('care.rxUpload.noMatches')}</p>}
        <ul style={{ paddingLeft: 20 }}>
          {items.map((item, index) => <li key={index} style={{ marginBottom: 12 }}>
            <strong>{item.raw_name || item.matched_catalog_name || item.source_span || t('care.rxUpload.unidentified')}</strong>
            <p>{t('care.rxUpload.extracted', { dosage: item.dosage || t('care.rxUpload.unknown'), frequency: item.frequency || t('care.rxUpload.unknown') })}</p>
            {item.source_span && <p>{t('care.rxUpload.source', { text: item.source_span })}</p>}
            <p>{outcome?.acceptedIndexes.includes(index) ? t('care.rxUpload.added') :
              outcome?.blocked.find(entry => entry.index === index)?.reason || t('care.rxUpload.needsReview')}</p>
          </li>)}
        </ul>
        <details open><summary>{t('care.rxUpload.original')}</summary><pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{rxText}</pre></details>
        <p className="wf-fineprint">{t('care.rxUpload.fineprint')}</p>
        <button type="button" className="health-button health-button-primary" onClick={handleAddToCart} disabled={busy || !!outcome || !items.length || !onAddToCart}>
          <ShoppingCart size={16} aria-hidden="true" /> {busy ? t('care.rxUpload.checkingCatalog') : t('care.rxUpload.addEligible')}
        </button>
        <button type="button" className="health-button" disabled={busy} onClick={() => { setItems(null); setOutcome(null); setError(null); }}>{t('care.rxUpload.rescan')}</button>
      </div>}
    </div>
  </div>;
}
