import React, { useEffect, useRef, useState } from 'react';
import { FileText, ShoppingCart, X } from 'lucide-react';
import { useAuth } from '../../data/AuthContext';
import { apiRequest } from '../../data/http';
import { navigate } from '../../lib/workflowRouting';
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
  const [rxText, setRxText] = useState('');
  const [items, setItems] = useState<ExtractedRxItem[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
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
    setError('');
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
        throw new Error('The extraction service returned an invalid result. Please try again.');
      }
      if (!controller.signal.aborted) setItems(result.extracted_items);
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Could not extract prescription text.');
    } finally {
      if (!controller.signal.aborted) { setBusy(false); request.current = null; }
    }
  };

  const handleAddToCart = async () => {
    if (!items || !onAddToCart || outcome || request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError('');
    try {
      const result = await onAddToCart(items, controller.signal);
      if (!controller.signal.aborted) setOutcome(result);
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Could not check catalog eligibility. No items were added.');
    } finally {
      if (!controller.signal.aborted) { setBusy(false); request.current = null; }
    }
  };

  return <div className="wf-modal-backdrop" onClick={close}>
    <div className="wf-modal-card" role="dialog" aria-modal="true" aria-labelledby="rx-modal-title" style={{ maxWidth: 620 }} onClick={event => event.stopPropagation()}>
      <button className="wf-modal-close" onClick={close} aria-label="Close modal"><X size={18} /></button>
      <div className="wf-modal-header">
        <h3 id="rx-modal-title"><FileText size={22} /> Prescription text review</h3>
        <p>Paste prescription text to find tentative catalog matches. Extraction does not verify or create a clinician prescription.</p>
      </div>
      {error && <div className="wf-notice" role="alert">{error}</div>}
      {!signedIn ? <>
        <p>Sign in to check prescription text against the catalog.</p>
        <button className="health-button health-button-primary" onClick={() => { close(); navigate('login', 'shop'); }}>Sign in</button>
      </> : items === null ? <form className="wf-form" onSubmit={handleAnalyze}>
        <label htmlFor="rx-source-text">Prescription text</label>
        <textarea id="rx-source-text" rows={6} value={rxText} onChange={event => setRxText(event.target.value)} disabled={busy} required maxLength={20000} />
        <p className="wf-fineprint">Text matching only. To store a PDF or image, use health records.</p>
        <button className="health-button" type="button" onClick={() => { close(); navigate('records'); }}>Open health records</button>
        <button className="health-button health-button-primary" type="submit" disabled={busy || !rxText.trim()}>{busy ? 'Checking prescription text…' : 'Find catalog matches'}</button>
      </form> : <div className="wf-form">
        <p>{items.length} extracted entries. Only active, in-stock, non-prescription products verified against the current server catalog can be added.</p>
        {outcome && <div className="wf-notice" role="status">{outcome.acceptedIndexes.length} added to cart; {outcome.blocked.length} blocked.</div>}
        {!items.length && <p>No catalog matches were returned. Keep the original text for pharmacist review.</p>}
        <ul style={{ paddingLeft: 20 }}>
          {items.map((item, index) => <li key={index} style={{ marginBottom: 12 }}>
            <strong>{item.raw_name || item.matched_catalog_name || item.source_span || 'Unidentified extracted entry'}</strong>
            <p>Extracted dosage: {item.dosage || 'unknown'} · Frequency: {item.frequency || 'unknown'} — unverified.</p>
            {item.source_span && <p>Source: {item.source_span}</p>}
            <p>{outcome?.acceptedIndexes.includes(index) ? 'Added as a non-prescription catalog product. Extraction still requires pharmacist review.' :
              outcome?.blocked.find(entry => entry.index === index)?.reason || 'Needs pharmacist review; catalog eligibility has not been checked.'}</p>
          </li>)}
        </ul>
        <details open><summary>Original text for pharmacist review</summary><pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{rxText}</pre></details>
        <p className="wf-fineprint">Unknown medicines and unverified instructions remain here for pharmacist review. Nothing has been sent to a pharmacist automatically.</p>
        <button className="health-button health-button-primary" onClick={handleAddToCart} disabled={busy || !!outcome || !items.length || !onAddToCart}>
          <ShoppingCart size={16} /> {busy ? 'Checking live catalog…' : 'Add eligible items to cart'}
        </button>
        <button className="health-button" disabled={busy} onClick={() => { setItems(null); setOutcome(null); setError(''); }}>Edit text / rescan</button>
      </div>}
    </div>
  </div>;
}
