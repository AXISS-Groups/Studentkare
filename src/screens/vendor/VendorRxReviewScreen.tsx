import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  FileText,
  Search,
} from 'lucide-react';
import { apiRequest } from '@/data/services/http';
import { useApiResource } from '@/hooks/api/useApiResource';
import { useMutation } from '@/components/interface/WorkflowUI';
import { navigate, RoutePath } from '@/lib/utils/workflowRouting';
import { useT } from '@/i18n';
import '@/theme/styles/vendorRxReview.css';

/** One prescribed line, as GET /v1/pharmacy/rx-reviews returns it. */
export interface RxReviewItem {
  id: string;
  genericName: string;
  brandName: string;
  strength: string;
  form: string;
  dose: string;
  frequency: string;
  durationDays: number;
  quantity: number;
  scheduleClass: string;
  registerRequired: boolean;
  substitutionAllowed: boolean;
}

/**
 * A prescription waiting for this pharmacy's pharmacist: an RX_ISSUED dispense.
 * Fulfilment fields only (Rule L) — no patient identity, advice or allergy record.
 */
export interface RxReview {
  dispenseId: string;
  receivedAt: number;
  prescriberRegNo: string;
  issuedAt: number;
  validUntil: number;
  expired: boolean;
  items: RxReviewItem[];
}

interface RxReviewQueue {
  reviews: RxReview[];
  total: number;
}

export interface VendorRxReviewScreenProps {
  /** Preview override for the design's state switcher. Live data is used otherwise. */
  initialViewState?: 'data' | 'loading' | 'empty' | 'error';
  onNavigate?: (route: string) => void;
  onLogout?: () => void;
}

type CheckId = 'reg' | 'date' | 'patient' | 'allergy' | 'sched';

interface PharmacistCheck {
  id: CheckId;
  label: string;
  meta: string;
}

interface RxDecision {
  ref: string;
  status: 'approved' | 'rejected';
  items: string;
}

type Tone = 'amber' | 'red' | 'green';

const TONE_STYLE: Record<Tone, React.CSSProperties> = {
  amber: { background: 'var(--sk-color-attention-bg)', color: 'var(--sk-color-attention)' },
  red: { background: 'var(--sk-color-danger-bg)', color: 'var(--sk-color-danger)' },
  green: { background: 'var(--sk-color-positive-bg)', color: 'var(--sk-color-positive)' },
};

/** Every check starts unticked: the pharmacist ticks each one themselves. */
const UNCHECKED: Record<CheckId, boolean> = { reg: false, date: false, patient: false, allergy: false, sched: false };

/** The server's names for the five checks, which it requires all of to approve. */
const SERVER_CHECK: Record<CheckId, string> = {
  reg: 'prescriberRegistration',
  date: 'prescriptionDate',
  patient: 'patientMatches',
  allergy: 'allergyChecked',
  sched: 'scheduleLogged',
};

const SCHEDULED = new Set(['H', 'H1', 'X']);

const reference = (review: RxReview) => review.dispenseId.slice(0, 8).toUpperCase();
const itemsSummary = (review: RxReview) =>
  review.items.map((item) => [item.genericName, item.strength].filter(Boolean).join(' ')).join(', ');
const day = (epochSeconds: number) =>
  new Date(epochSeconds * 1000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

/**
 * Pharmacist review of a prescription before it is dispensed.
 *
 * The queue is this pharmacy's RX_ISSUED dispenses (GET /v1/pharmacy/rx-reviews).
 * Approving records the named pharmacist and moves the dispense to RX_VERIFIED;
 * rejecting moves it to REJECTED with a reason the student is told. Both are
 * saved by the server. Messaging the prescriber does not exist yet, and the
 * screen says so rather than pretending to send anything.
 */
export function VendorRxReviewScreen({ initialViewState, onNavigate }: VendorRxReviewScreenProps) {
  const t = useT();
  const queue = useApiResource<RxReviewQueue>('/v1/pharmacy/rx-reviews');
  const mutation = useMutation();

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [history, setHistory] = useState<RxDecision[]>([]);
  const [queueTab, setQueueTab] = useState<'waiting' | 'processed'>('waiting');
  const [checks, setChecks] = useState<Record<CheckId, boolean>>(UNCHECKED);
  const [pharmacistName, setPharmacistName] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const liveViewState: 'data' | 'loading' | 'error' = queue.loading ? 'loading' : queue.error ? 'error' : 'data';
  const viewState = initialViewState ?? liveViewState;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleNavClick = (target: string) => {
    if (onNavigate) {
      onNavigate(target);
    } else {
      navigate(target as RoutePath);
    }
  };


  const activeList = useMemo(() => queue.data?.reviews ?? [], [queue.data]);

  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return activeList;
    const q = searchQuery.toLowerCase().trim();
    return activeList.filter(
      (r) =>
        reference(r).toLowerCase().includes(q) ||
        itemsSummary(r).toLowerCase().includes(q) ||
        r.items.some((item) => item.brandName.toLowerCase().includes(q)) ||
        r.prescriberRegNo.toLowerCase().includes(q)
    );
  }, [activeList, searchQuery]);

  const currentRx = filteredList.find((r) => r.dispenseId === selectedId) || filteredList[0] || activeList[0] || null;

  const resetDecision = () => {
    setChecks(UNCHECKED);
    setRejecting(false);
    setRejectReason('');
    mutation.setError('');
  };

  const select = (id: string) => {
    if (id === currentRx?.dispenseId) return;
    setSelectedId(id);
    resetDecision();
  };

  const flagFor = (review: RxReview): { label: string; tone: Tone } => {
    if (review.expired) return { label: t('partner.vrx.rx.flag.expired'), tone: 'red' };
    const scheduled = review.items.find((item) => SCHEDULED.has(item.scheduleClass));
    if (scheduled) return { label: t('partner.vrx.rx.flag.schedule', { cls: scheduled.scheduleClass }), tone: 'red' };
    return { label: t('partner.vrx.rx.flag.needsReview'), tone: 'amber' };
  };

  const ageFor = (review: RxReview) => {
    const minutes = Math.max(0, Math.round((Date.now() / 1000 - review.receivedAt) / 60));
    if (minutes < 60) return t('partner.vrx.rx.age.minutes', { count: minutes });
    if (minutes < 1440) return t('partner.vrx.rx.age.hours', { count: Math.floor(minutes / 60) });
    return t('partner.vrx.rx.age.days', { count: Math.floor(minutes / 1440) });
  };

  const validity = (review: RxReview) => ({
    date: day(review.issuedAt),
    until: review.validUntil ? day(review.validUntil) : t('partner.vrx.rx.noExpiry'),
  });

  const scriptLine = (item: RxReviewItem, index: number) => {
    const name = [item.genericName, item.brandName ? `(${item.brandName})` : '', item.strength, item.form].filter(Boolean).join(' ');
    const sig = [item.dose, item.frequency, item.durationDays ? `× ${item.durationDays}d` : ''].filter(Boolean).join(' ');
    return `${index + 1}. ${name}${sig ? ` — ${sig}` : ''}`;
  };

  const checkItems: PharmacistCheck[] = currentRx
    ? [
        {
          id: 'reg',
          label: t('partner.vrx.rx.check.reg'),
          meta: currentRx.prescriberRegNo
            ? t('partner.vrx.rx.check.regMeta', { reg: currentRx.prescriberRegNo })
            : t('partner.vrx.rx.regMissing'),
        },
        { id: 'date', label: t('partner.vrx.rx.check.date'), meta: t('partner.vrx.rx.check.dateMeta', validity(currentRx)) },
        { id: 'patient', label: t('partner.vrx.rx.check.patient'), meta: t('partner.vrx.rx.check.patientMeta') },
        { id: 'allergy', label: t('partner.vrx.rx.check.allergy'), meta: t('partner.vrx.rx.check.allergyMeta') },
        { id: 'sched', label: t('partner.vrx.rx.check.sched'), meta: t('partner.vrx.rx.check.schedMeta') },
      ]
    : [];

  const allChecksComplete = checkItems.length > 0 && checkItems.every((c) => checks[c.id]);
  const canApprove = !!currentRx && !currentRx.expired && allChecksComplete && !!pharmacistName.trim() && !mutation.busy;

  const toggleCheck = (id: CheckId) => setChecks((prev) => ({ ...prev, [id]: !prev[id] }));

  const decided = (review: RxReview, status: RxDecision['status'], message: string) => {
    setHistory((prev) => [{ ref: reference(review), status, items: itemsSummary(review) }, ...prev]);
    setSelectedId('');
    resetDecision();
    showToast(message);
    queue.reload();
  };

  const handleApprove = () => {
    if (!currentRx || !canApprove) return;
    const review = currentRx;
    const name = pharmacistName.trim();
    const body = {
      pharmacistName: name,
      checks: Object.fromEntries(
        (Object.keys(SERVER_CHECK) as CheckId[]).map((id) => [SERVER_CHECK[id], checks[id]])
      ),
    };
    mutation.run(
      () => apiRequest(`/v1/pharmacy/rx-reviews/${encodeURIComponent(review.dispenseId)}/approve`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
      () => decided(review, 'approved', t('partner.vrx.rx.toast.approved', { id: reference(review), name })),
    );
  };

  const handleReject = () => {
    if (!currentRx || !rejectReason.trim() || mutation.busy) return;
    const review = currentRx;
    mutation.run(
      () => apiRequest(`/v1/pharmacy/rx-reviews/${encodeURIComponent(review.dispenseId)}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: rejectReason.trim() }),
      }),
      () => decided(review, 'rejected', t('partner.vrx.rx.toast.rejected', { id: reference(review) })),
    );
  };

  const handleClarify = () => {
    if (!currentRx) return;
    showToast(t('partner.vrx.rx.toast.clarify'));
  };

  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    minHeight: 44,
    padding: '6px 10px',
    borderRadius: 8,
    fontSize: 11.5,
    fontWeight: 700,
    border: '1px solid',
    borderColor: active ? 'var(--sk-color-action)' : 'var(--sk-color-rule)',
    background: active ? 'var(--sk-color-action-soft)' : 'var(--sk-color-surface)',
    color: active ? 'var(--sk-color-action)' : 'var(--sk-color-text-2)',
    cursor: 'pointer',
  });

  const statusBadgeStyle = (approved: boolean): React.CSSProperties => ({
    fontSize: 11,
    fontWeight: 700,
    padding: '2px 7px',
    borderRadius: 6,
    background: approved ? 'var(--sk-color-positive-bg)' : 'var(--sk-color-danger-bg)',
    color: approved ? 'var(--sk-color-positive)' : 'var(--sk-color-danger)',
  });

  const statusLabel = (status: RxDecision['status']) =>
    status === 'approved' ? t('partner.vrx.rx.status.approved') : t('partner.vrx.rx.status.rejected');

  const fieldStyle: React.CSSProperties = {
    width: '100%',
    minHeight: 44,
    padding: '8px 12px',
    borderRadius: 10,
    border: '1px solid var(--sk-color-rule-strong)',
    background: 'var(--sk-color-surface)',
    color: 'var(--sk-color-text)',
    fontSize: 13,
    boxSizing: 'border-box',
  };

  const showEmpty = viewState === 'empty' || (viewState === 'data' && activeList.length === 0);

  return (
    <div className="sk-rx-layout">
      {/* Toast Notification */}
      {toastMessage && (
        <div role="status" aria-live="polite" className="sk-rx-toast">
          <CheckCircle2 size={18} aria-hidden="true" style={{ color: 'var(--sk-color-positive-fill)' }} />
          <span>{toastMessage}</span>
        </div>
      )}


      {/* Main Content Area */}
      <div className="sk-rx-content-wrap">
        <header className="sk-rx-top-bar">
          <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--sk-color-text)' }}>{t('partner.vrx.rx.title')}</span>
          <label className="sk-rx-search-label">
            <Search size={16} aria-hidden="true" style={{ color: 'var(--sk-color-text-3)' }} />
            <input
              type="search"
              aria-label={t('partner.vrx.rx.searchAria')}
              placeholder={t('partner.vrx.rx.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="sk-rx-search-input"
            />
          </label>
          <span style={{ flexGrow: 1 }} />
        </header>

        {/* Main Body */}
        <main className="sk-rx-main">
          {/* Header Title Area — shown in every state so the page always has its heading */}
          <div className="sk-rx-header">
            <div>
              <h1 className="sk-rx-title">{t('partner.vrx.rx.title')}</h1>
              <div className="sk-rx-subtitle">{t('partner.vrx.rx.subtitle')}</div>
            </div>
          </div>

          {/* Loading Skeleton */}
          {viewState === 'loading' && (
            <div aria-busy="true" aria-label={t('partner.vrx.rx.loading')} style={{ display: 'flex', flexDirection: 'column', gap: 18, flexGrow: 1 }}>
              <div style={{ display: 'flex', gap: 16, flexGrow: 1 }}>
                <span className="sk-rx-skel" style={{ width: 300, height: 480 }} />
                <span className="sk-rx-skel" style={{ flex: 1, height: 480 }} />
                <span className="sk-rx-skel" style={{ width: 400, height: 480 }} />
              </div>
            </div>
          )}

          {/* Empty State */}
          {showEmpty ? (
            <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
              <div style={{ width: 520, maxWidth: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center' }}>
                <FileText size={64} aria-hidden="true" style={{ color: 'var(--sk-color-action)' }} />
                <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--sk-color-text)', letterSpacing: -0.4 }}>
                  {t('partner.vrx.rx.empty.title')}
                </span>
                <span style={{ fontSize: 14, lineHeight: 1.55, fontWeight: 500, color: 'var(--sk-color-text-2)' }}>
                  {t('partner.vrx.rx.empty.body')}
                </span>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: 8 }}>
                  <button
                    type="button"
                    className="sk-rx-secondary-btn"
                    onClick={() => handleNavClick('catalogue')}
                    style={{ height: 44, padding: '0 18px', fontSize: 13.5 }}
                  >
                    {t('partner.vrx.rx.empty.catalogue')}
                  </button>
                </div>

                {history.length > 0 && (
                  <div style={{ width: '100%', marginTop: 20, textAlign: 'left', background: 'var(--sk-color-surface)', border: '1px solid var(--sk-color-rule)', borderRadius: 14, padding: '16px 18px' }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--sk-color-text)', marginBottom: 12 }}>
                      <span>{t('partner.vrx.rx.session.heading', { count: history.length })}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {history.map((h) => (
                        <div key={h.ref} style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '10px 12px', background: 'var(--sk-color-surface-2)', borderRadius: 10, border: '1px solid var(--sk-color-rule-soft)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 12.5, color: 'var(--sk-color-text)' }}>{h.ref}</span>
                            <span style={statusBadgeStyle(h.status === 'approved')}>{statusLabel(h.status)}</span>
                          </div>
                          <span style={{ fontSize: 12, color: 'var(--sk-color-text-2)' }}>{h.items}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {/* Error State */}
          {viewState === 'error' && (
            <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div role="alert" style={{ width: 480, maxWidth: '100%', padding: 30, borderRadius: 24, background: 'var(--sk-color-surface)', border: '1.5px solid var(--sk-color-danger)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center' }}>
                <span style={{ width: 64, height: 64, borderRadius: 999, background: 'var(--sk-color-danger-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertTriangle size={30} aria-hidden="true" style={{ color: 'var(--sk-color-danger)' }} />
                </span>
                <span style={{ fontSize: 21, fontWeight: 800, color: 'var(--sk-color-text)' }}>
                  {t('partner.vrx.rx.error.title')}
                </span>
                <span style={{ fontSize: 14, lineHeight: 1.55, fontWeight: 500, color: 'var(--sk-color-text-2)' }}>
                  {t('partner.vrx.common.errorBody')}
                </span>
                <div style={{ display: 'flex', gap: 10, paddingTop: 6 }}>
                  <button type="button" onClick={queue.reload} className="sk-rx-btn-approve" style={{ maxWidth: 140 }}>
                    {t('common.tryAgain')}
                  </button>
                  <button type="button" onClick={() => handleNavClick('vendor')} className="sk-rx-secondary-btn" style={{ maxWidth: 140 }}>
                    {t('partner.vrx.common.backToHome')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Normal Data State */}
          {viewState === 'data' && activeList.length > 0 && currentRx && (
            <div className="sk-rx-columns">
              {/* Column 1: Waiting Prescriptions Queue */}
              <section className="sk-rx-col-queue" aria-label={t('partner.vrx.rx.queueAria')}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 8px' }}>
                  <span className="sk-rx-queue-heading" style={{ padding: 0 }}>
                    {queueTab === 'waiting'
                      ? t('partner.vrx.rx.queue.waitingHeading', { count: activeList.length })
                      : t('partner.vrx.rx.queue.sessionHeading', { count: history.length })}
                  </span>
                </div>

                {/* Sub-tabs for Waiting vs Processed */}
                <div style={{ display: 'flex', gap: 6, padding: '0 16px 10px', borderBottom: '1px solid var(--sk-color-rule-soft)' }} role="tablist" aria-label={t('partner.vrx.rx.queue.filterAria')}>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={queueTab === 'waiting'}
                    onClick={() => setQueueTab('waiting')}
                    style={tabStyle(queueTab === 'waiting')}
                  >
                    {t('partner.vrx.rx.queue.waitingTab', { count: activeList.length })}
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={queueTab === 'processed'}
                    onClick={() => setQueueTab('processed')}
                    style={tabStyle(queueTab === 'processed')}
                  >
                    {t('partner.vrx.rx.queue.processedTab', { count: history.length })}
                  </button>
                </div>

                {queueTab === 'waiting' && (
                  <>
                    {filteredList.length === 0 ? (
                      <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--sk-color-text-2)', fontSize: 13 }}>
                        <div>{t('partner.vrx.rx.queue.noMatch', { query: searchQuery })}</div>
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          style={{
                            marginTop: 10,
                            minHeight: 44,
                            padding: '6px 14px',
                            borderRadius: 8,
                            border: '1px solid var(--sk-color-rule-strong)',
                            background: 'var(--sk-color-surface)',
                            color: 'var(--sk-color-action)',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          {t('partner.vrx.rx.queue.clearSearch')}
                        </button>
                      </div>
                    ) : (
                      filteredList.map((r) => {
                        const isSelected = r.dispenseId === currentRx.dispenseId;
                        const flag = flagFor(r);
                        return (
                          <button
                            key={r.dispenseId}
                            type="button"
                            onClick={() => select(r.dispenseId)}
                            className={`sk-rx-queue-item ${isSelected ? 'is-selected' : ''}`}
                            aria-pressed={isSelected}
                          >
                            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ fontFamily: 'monospace', fontSize: 12.5, fontWeight: 700, color: 'var(--sk-color-text)' }}>
                                {reference(r)}
                              </span>
                              <span style={{ fontFamily: 'monospace', fontSize: 11.5, color: 'var(--sk-color-text-2)' }}>
                                {ageFor(r)}
                              </span>
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--sk-color-text)' }}>
                              {itemsSummary(r)}
                            </span>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                height: 24,
                                padding: '0 8px',
                                borderRadius: 999,
                                fontSize: 11,
                                fontWeight: 800,
                                ...TONE_STYLE[flag.tone],
                              }}
                            >
                              {flag.label}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </>
                )}

                {queueTab === 'processed' && (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {history.length === 0 ? (
                      <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--sk-color-text-2)', fontSize: 13 }}>
                        {t('partner.vrx.rx.queue.noneProcessed')}
                      </div>
                    ) : (
                      history.map((h) => (
                        <div
                          key={h.ref}
                          style={{
                            padding: '12px 16px',
                            borderTop: '1px solid var(--sk-color-rule-soft)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 6,
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 12.5, color: 'var(--sk-color-text)' }}>
                              {h.ref}
                            </span>
                            <span style={statusBadgeStyle(h.status === 'approved')}>{statusLabel(h.status)}</span>
                          </div>
                          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--sk-color-text-2)' }}>{h.items}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </section>

              {/* Column 2: Prescription as written */}
              <section className="sk-rx-col-document" aria-label={t('partner.vrx.rx.documentAria')}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--sk-color-text)' }}>{t('partner.vrx.rx.documentTitle')}</span>
                </div>

                <div className="sk-rx-paper-slip">
                  <span className="sk-rx-paper-doctor">
                    {currentRx.prescriberRegNo
                      ? t('partner.vrx.rx.paperPrescriber', { reg: currentRx.prescriberRegNo })
                      : t('partner.vrx.rx.regMissing')}
                  </span>
                  <span className="sk-rx-paper-meta">{t('partner.vrx.rx.paperMeta', validity(currentRx))}</span>
                  <div className="sk-rx-paper-divider" />
                  <div className="sk-rx-paper-script">
                    <strong style={{ display: 'block', fontSize: 22, marginBottom: 4 }}>Rx</strong>
                    {currentRx.items.map((item, idx) => (
                      <div key={item.id} style={{ marginBottom: 4 }}>
                        {scriptLine(item, idx)}
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Column 3: Pharmacist Checks */}
              <section className="sk-rx-col-checks" aria-label={t('partner.vrx.rx.checksAria')}>
                <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--sk-color-text)' }}>{t('partner.vrx.rx.checksTitle')}</span>

                {currentRx.expired && (
                  <p role="alert" style={{ margin: 0, padding: '10px 12px', borderRadius: 10, background: 'var(--sk-color-danger-bg)', color: 'var(--sk-color-danger)', fontSize: 12.5, fontWeight: 700 }}>
                    {t('partner.vrx.rx.expiredNotice')}
                  </p>
                )}

                {checkItems.map((c) => {
                  const isChecked = checks[c.id];
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleCheck(c.id)}
                      className={`sk-rx-check-btn ${isChecked ? 'is-checked' : ''}`}
                      role="checkbox"
                      aria-checked={isChecked}
                      aria-label={`${c.label}: ${c.meta}`}
                    >
                      <div className={`sk-rx-check-box ${isChecked ? 'is-checked' : ''}`}>
                        {isChecked && <Check size={12} strokeWidth={3} aria-hidden="true" style={{ color: 'var(--sk-color-on-action)' }} />}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--sk-color-text)' }}>{c.label}</span>
                        <span style={{ fontSize: 11.5, color: 'var(--sk-color-text-2)' }}>{c.meta}</span>
                      </div>
                    </button>
                  );
                })}

                <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, color: 'var(--sk-color-text-2)', paddingTop: 6 }}>
                  {t('partner.vrx.rx.itemsHeading')}
                </span>

                {currentRx.items.map((item) => {
                  const scheduled = SCHEDULED.has(item.scheduleClass);
                  return (
                    <div key={item.id} className="sk-rx-ocr-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--sk-color-text)' }}>
                          {[item.genericName, item.strength, item.form].filter(Boolean).join(' ')}
                        </span>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: 999,
                            fontSize: 10.5,
                            fontWeight: 800,
                            ...TONE_STYLE[scheduled ? 'red' : 'green'],
                          }}
                        >
                          {item.scheduleClass}
                        </span>
                      </div>
                      <span style={{ fontFamily: 'monospace', fontSize: 11.5, color: 'var(--sk-color-text-2)' }}>
                        {[item.dose, item.frequency, item.durationDays ? `× ${item.durationDays}d` : '', t('partner.vrx.rx.item.qty', { count: item.quantity })]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                      {item.registerRequired && (
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--sk-color-attention)' }}>
                          {t('partner.vrx.rx.item.register', { cls: item.scheduleClass })}
                        </span>
                      )}
                      {!item.substitutionAllowed && (
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--sk-color-attention)' }}>
                          {t('partner.vrx.rx.item.noSubstitution')}
                        </span>
                      )}
                    </div>
                  );
                })}

                <div style={{ flexGrow: 1 }} />

                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12.5, fontWeight: 700, color: 'var(--sk-color-text)' }}>
                  {t('partner.vrx.rx.pharmacistName')}
                  <input
                    type="text"
                    value={pharmacistName}
                    maxLength={120}
                    autoComplete="name"
                    onChange={(e) => setPharmacistName(e.target.value)}
                    style={fieldStyle}
                  />
                  <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--sk-color-text-2)' }}>{t('partner.vrx.rx.pharmacistNameHint')}</span>
                </label>

                {mutation.error && (
                  <p role="alert" style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: 'var(--sk-color-danger)' }}>
                    {mutation.error}
                  </p>
                )}

                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={!canApprove}
                  aria-busy={mutation.busy}
                  className="sk-rx-btn-approve"
                >
                  {t('partner.vrx.rx.approve')}
                </button>

                {rejecting ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12.5, fontWeight: 700, color: 'var(--sk-color-text)' }}>
                      {t('partner.vrx.rx.rejectReason')}
                      <textarea
                        value={rejectReason}
                        maxLength={300}
                        rows={3}
                        onChange={(e) => setRejectReason(e.target.value)}
                        style={fieldStyle}
                      />
                    </label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="button" onClick={handleReject} disabled={!rejectReason.trim() || mutation.busy} className="sk-rx-secondary-btn">
                        {t('partner.vrx.rx.rejectConfirm')}
                      </button>
                      <button type="button" onClick={() => { setRejecting(false); setRejectReason(''); }} className="sk-rx-secondary-btn">
                        {t('partner.vrx.common.cancel')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" onClick={handleClarify} className="sk-rx-secondary-btn">
                      {t('partner.vrx.rx.askDoctor')}
                    </button>
                    <button type="button" onClick={() => setRejecting(true)} className="sk-rx-secondary-btn">
                      {t('partner.vrx.rx.reject')}
                    </button>
                  </div>
                )}

                <span style={{ fontSize: 11.5, lineHeight: 1.5, color: 'var(--sk-color-text-2)', textAlign: 'center' }}>
                  {t('partner.vrx.rx.substitutionNote')}
                </span>
              </section>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default VendorRxReviewScreen;
