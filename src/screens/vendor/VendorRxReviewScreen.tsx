import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ConsoleTopbar } from '@/design-system/console-shell/ConsoleShell';
import { TeamBadge } from '@/features/team-accounts/TeamBadge';
import { Icon } from '@/design-system/icons';
import { SkButton, Toast } from '@/design-system/primitives';
import { apiBaseUrl } from '@/core/env';
import { useAuth } from '@/data/contexts/AuthContext';
import { useT } from '@/i18n';
import { navigate, RoutePath } from '@/lib/utils/workflowRouting';
import { PartnerEmpty, PartnerError, PartnerLoading, usePartnerLoad } from '@/features/partner/PartnerPage';
import { partnerDisplayName, partnerInitials } from './partnerAccess';
import {
  approveRx, loadRxReviews, loadTwoFactorStatus, refOf, rejectRx, rxUploadLink, SCHEDULED_CLASSES,
} from '@/features/partner/work/pharmacyWork';
import type { DispenseItem, RxChecks, RxReview, RxReviewQueue, RxUpload } from '@/features/partner/work/pharmacyWork';
import { shortDate, useOnline } from '@/features/partner/work/workCopy';
import '@/theme/styles/vendorRxReview.css';
import '@/features/partner/work/partner-work.css';

/**
 * VendorRxReview — pharmacist prescription review (design page 6, Tier 1, approved 2026-10-21).
 *
 * The queue is this pharmacy's prescriptions no pharmacist has checked
 * (`GET /v1/pharmacy/rx-reviews`): e-prescriptions with their lines, and files
 * students uploaded, opened only through the server's two-minute link. Approve
 * records the named pharmacist and needs all five checks (the server refuses
 * otherwise) and, for an e-prescription, every line confirmed against what is
 * written; reject sends the student the reason.
 *
 * Approved decisions: the pharmacist never sees the student's allergy record
 * (Rule L); the allergy check is asked in person. OCR suggestions are not
 * connected, so an uploaded file has no read-out lines. "Ask the doctor" has no
 * endpoint and is not drawn. "2FA on" shows only when the server reports it.
 * Offline, nothing can be approved or rejected.
 */

type Selected = { kind: 'review'; review: RxReview } | { kind: 'upload'; upload: RxUpload };
type CheckId = keyof RxChecks;
const CHECK_IDS: CheckId[] = ['prescriberRegistration', 'prescriptionDate', 'patientMatches', 'allergyChecked', 'scheduleLogged'];
const UNCHECKED: RxChecks = { prescriberRegistration: false, prescriptionDate: false, patientMatches: false, allergyChecked: false, scheduleLogged: false };

const idOf = (selected: Selected) => (selected.kind === 'review' ? selected.review.dispenseId : selected.upload.reviewId);
const itemName = (item: DispenseItem) => [item.genericName, item.brandName ? `(${item.brandName})` : '', item.strength, item.form].filter(Boolean).join(' ');
const itemSig = (item: DispenseItem & { durationDays?: number }) => [item.dose, item.frequency, item.durationDays ? `× ${item.durationDays}d` : ''].filter(Boolean).join(' ');

export interface VendorRxReviewScreenProps {
  source?: (signal: AbortSignal) => Promise<RxReviewQueue>;
  twoFactorSource?: (signal: AbortSignal) => Promise<{ enabled: boolean }>;
  onNavigate?: (route: string) => void;
  onLogout?: () => void;
}

export function VendorRxReviewScreen({ source = loadRxReviews, twoFactorSource = loadTwoFactorStatus, onNavigate }: VendorRxReviewScreenProps) {
  const t = useT();
  const { user } = useAuth();
  const online = useOnline();
  const load = useCallback((signal: AbortSignal) => source(signal), [source]);
  const queue = usePartnerLoad<RxReviewQueue>(load);
  const twoFactorLoad = useCallback((signal: AbortSignal) => twoFactorSource(signal), [twoFactorSource]);
  const twoFactor = usePartnerLoad<{ enabled: boolean }>(twoFactorLoad);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const go = (route: RoutePath) => (onNavigate ? onNavigate(route) : navigate(route));
  const name = partnerDisplayName(user);

  const all: Selected[] = useMemo(() => [
    ...(queue.data?.reviews ?? []).map((review): Selected => ({ kind: 'review', review })),
    ...(queue.data?.uploads ?? []).map((upload): Selected => ({ kind: 'upload', upload })),
  ], [queue.data]);
  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return all;
    return all.filter((entry) => {
      const id = refOf(idOf(entry)).toLowerCase();
      if (id.includes(q)) return true;
      if (entry.kind === 'upload') return false;
      return entry.review.prescriberRegNo.toLowerCase().includes(q) || entry.review.items.some((item) => itemName(item).toLowerCase().includes(q));
    });
  }, [all, search]);
  const current = list.find((entry) => idOf(entry) === selectedId) ?? list[0] ?? null;

  const topbar = (
    <ConsoleTopbar
      title={t('partner.vrx.rx.title')}
      badge={<TeamBadge />}
      search={{ label: t('partner.vrx.rx.searchPlaceholder'), value: search, onChange: setSearch }}
      twoFactorLabel={twoFactor.data?.enabled ? t('pt.rxr.twoFactorOn') : undefined}
      notifications={{ label: t('console.notifications'), onClick: () => setToast(t('partner.vhome.home.notificationsOff')) }}
      account={<span className="pw-account"><span className="pw-account__avatar" aria-hidden="true">{partnerInitials(name)}</span><span className="pw-account__name">{name}</span></span>}
    />
  );

  let body: React.ReactNode;
  if (queue.status === 'loading' && !queue.data) body = <PartnerLoading label={t('partner.vrx.rx.loading')} tiles={0} rows={6} />;
  else if (queue.status === 'error') body = <PartnerError title={t('partner.vrx.rx.error.title')} reference={t('pt.rxr.ref')} detail={queue.error || undefined} onRetry={queue.reload} onHelp={() => go('support')} />;
  else if (all.length === 0) body = <PartnerEmpty title={t('partner.vrx.rx.empty.title')} body={t('partner.vrx.rx.empty.body')} action={{ label: t('partner.vrx.rx.empty.catalogue'), onSelect: () => go('catalogue') }} />;
  else {
    body = (
      <div className="sk-rx-columns">
        <section className="sk-rx-col-queue" aria-labelledby="pw-rx-queue-title">
          <h2 id="pw-rx-queue-title" className="sk-rx-queue-heading">{t('partner.vrx.rx.queue.waitingHeading', { count: all.length })}</h2>
          {list.length === 0 ? (
            <div className="pw-rx-nomatch">
              <p className="pw-hint">{t('partner.vrx.rx.queue.noMatch', { query: search })}</p>
              <SkButton variant="secondary" onClick={() => setSearch('')}>{t('partner.vrx.rx.queue.clearSearch')}</SkButton>
            </div>
          ) : (
            <ul className="pw-rx-queue" aria-label={t('partner.vrx.rx.queueAria')}>
              {list.map((entry) => {
                const id = idOf(entry);
                const on = current ? idOf(current) === id : false;
                const flag = flagOf(entry, t);
                return (
                  <li key={id}>
                    <button type="button" className={`sk-rx-queue-item${on ? ' is-selected' : ''}`} aria-pressed={on} onClick={() => setSelectedId(id)}>
                      <span className="pw-rx-queue__top"><span className="pw-rx-queue__id">{t('pt.rxr.rxId', { ref: refOf(id) })}</span><span className="pw-rx-queue__age">{ageOf(entry.kind === 'review' ? entry.review.receivedAt : entry.upload.receivedAt, t)}</span></span>
                      <span className="pw-rx-queue__items">{entry.kind === 'review' ? entry.review.items.map((item) => [item.genericName, item.strength].filter(Boolean).join(' ')).join(', ') : t('pt.rxr.uploaded')}</span>
                      <span className={`pw-flag pw-flag--${flag.tone}`}>{flag.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        {current ? <ReviewPanel key={idOf(current)} selected={current} online={online} onDecided={(message) => { setSelectedId(''); setToast(message); queue.reload(); }} /> : null}
      </div>
    );
  }

  return (
    <div className="pw-rx-root">
      {topbar}
      <main className="sk-ds sk-rx-main" aria-labelledby="pw-rx-title">
        <header className="sk-rx-header">
          <div>
            <h1 id="pw-rx-title" className="sk-rx-title">{t('partner.vrx.rx.title')}</h1>
            <p className="sk-rx-subtitle">{t('partner.vrx.rx.subtitle')}</p>
          </div>
        </header>
        {!online ? <p className="pc-note pc-note--attention pc-note__text" role="status">{t('pt.offline.readOnly')}</p> : null}
        {body}
      </main>
      {toast ? <Toast message={toast} onDone={() => setToast(null)} /> : null}
    </div>
  );
}

type Translate = ReturnType<typeof useT>;

function ageOf(receivedAt: number, t: Translate): string {
  const minutes = Math.max(0, Math.round((Date.now() / 1000 - receivedAt) / 60));
  if (minutes < 60) return t('partner.vrx.rx.age.minutes', { count: minutes });
  if (minutes < 1440) return t('partner.vrx.rx.age.hours', { count: Math.floor(minutes / 60) });
  return t('partner.vrx.rx.age.days', { count: Math.floor(minutes / 1440) });
}

function flagOf(entry: Selected, t: Translate): { label: string; tone: 'attention' | 'danger' | 'info' } {
  if (entry.kind === 'upload') return { label: t('pt.rxr.flag.upload'), tone: 'info' };
  if (entry.review.expired) return { label: t('partner.vrx.rx.flag.expired'), tone: 'danger' };
  const scheduled = entry.review.items.find((item) => SCHEDULED_CLASSES.has(item.scheduleClass));
  if (scheduled) return { label: t('partner.vrx.rx.flag.schedule', { cls: scheduled.scheduleClass }), tone: 'attention' };
  return { label: t('partner.vrx.rx.flag.needsReview'), tone: 'attention' };
}

function ReviewPanel({ selected, online, onDecided }: { selected: Selected; online: boolean; onDecided: (message: string) => void }) {
  const t = useT();
  const [checks, setChecks] = useState<RxChecks>(UNCHECKED);
  const [confirmed, setConfirmed] = useState<ReadonlySet<string>>(new Set());
  const [pharmacist, setPharmacist] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [opening, setOpening] = useState(false);
  useEffect(() => { setError(''); }, [selected]);

  const review = selected.kind === 'review' ? selected.review : null;
  const id = idOf(selected);
  const items = review?.items ?? [];
  const expired = review?.expired ?? false;
  const everyCheck = CHECK_IDS.every((check) => checks[check]);
  const everyItem = items.every((item) => confirmed.has(item.id));
  const canApprove = online && !busy && !expired && everyCheck && everyItem && pharmacist.trim().length > 0;
  const validity = review ? { date: shortDate(review.issuedAt), until: review.validUntil ? shortDate(review.validUntil) : t('partner.vrx.rx.noExpiry') } : null;

  const meta: Record<CheckId, string> = {
    prescriberRegistration: review ? (review.prescriberRegNo ? t('partner.vrx.rx.check.regMeta', { reg: review.prescriberRegNo }) : t('partner.vrx.rx.regMissing')) : t('pt.rxr.onImage'),
    prescriptionDate: validity ? t('partner.vrx.rx.check.dateMeta', validity) : t('pt.rxr.onImage'),
    patientMatches: t('partner.vrx.rx.check.patientMeta'),
    allergyChecked: t('partner.vrx.rx.check.allergyMeta'),
    scheduleLogged: t('partner.vrx.rx.check.schedMeta'),
  };
  const label: Record<CheckId, string> = {
    prescriberRegistration: t('partner.vrx.rx.check.reg'),
    prescriptionDate: t('partner.vrx.rx.check.date'),
    patientMatches: t('partner.vrx.rx.check.patient'),
    allergyChecked: t('partner.vrx.rx.check.allergy'),
    scheduleLogged: t('partner.vrx.rx.check.sched'),
  };

  const act = async (action: () => Promise<unknown>, message: string) => {
    if (!online || busy) return;
    setBusy(true);
    setError('');
    try {
      await action();
      onDecided(message);
    } catch (reasonError) {
      setError(reasonError instanceof Error && reasonError.message ? reasonError.message : t('pt.saveFailed'));
    } finally {
      setBusy(false);
    }
  };

  const openUpload = async () => {
    if (selected.kind !== 'upload' || opening) return;
    setOpening(true);
    setError('');
    try {
      const link = await rxUploadLink(selected.upload.reviewId);
      // The server returns its own /api path; the file opens in a new tab for this session only.
      const base = apiBaseUrl().replace(/\/api\/?$/, '');
      window.open(`${base}${link.url}`, '_blank', 'noopener,noreferrer');
    } catch (reasonError) {
      setError(reasonError instanceof Error && reasonError.message ? reasonError.message : t('pt.rxr.openFailed'));
    } finally {
      setOpening(false);
    }
  };

  return (
    <>
      <section className="sk-rx-col-document" aria-labelledby="pw-rx-doc-title">
        <h2 id="pw-rx-doc-title" className="pw-rx-coltitle">
          {review ? t('partner.vrx.rx.documentTitle') : t('pt.rxr.imageTitle')}
          <span className="pw-rx-coltitle__meta">{review ? t('pt.rxr.rxId', { ref: refOf(id) }) : t('pt.rxr.uploadedAt', { when: shortDate(selected.kind === 'upload' ? selected.upload.receivedAt : 0) })}</span>
        </h2>
        {review ? (
          <div className="sk-rx-paper-slip">
            <span className="sk-rx-paper-doctor">{review.prescriberRegNo ? t('partner.vrx.rx.paperPrescriber', { reg: review.prescriberRegNo }) : t('partner.vrx.rx.regMissing')}</span>
            {validity ? <span className="sk-rx-paper-meta">{t('partner.vrx.rx.paperMeta', validity)}</span> : null}
            <span className="sk-rx-paper-divider" aria-hidden="true" />
            <ol className="sk-rx-paper-script pw-rx-script">
              {items.map((item) => <li key={item.id}>{itemName(item)}{itemSig(item) ? ` — ${itemSig(item)}` : ''}</li>)}
            </ol>
          </div>
        ) : (
          <div className="pw-rx-upload">
            <Icon name="file" size={40} strokeWidth={1.8} />
            <p className="pw-hint">{t('pt.rxr.uploadBody')}</p>
            <SkButton onClick={() => { void openUpload(); }} busy={opening} disabled={!online || opening}>{t('pt.rxr.open')}</SkButton>
          </div>
        )}
      </section>

      <section className="sk-rx-col-checks" aria-labelledby="pw-rx-checks-title">
        <h2 id="pw-rx-checks-title" className="pw-rx-coltitle">{t('partner.vrx.rx.checksTitle')}</h2>
        {expired ? <p className="pc-note pc-note--danger pc-note__text" role="alert">{t('partner.vrx.rx.expiredNotice')}</p> : null}
        <div className="pw-rx-checks" role="group" aria-label={t('partner.vrx.rx.checksAria')}>
          {CHECK_IDS.map((check) => (
            <button key={check} type="button" role="checkbox" aria-checked={checks[check]} className={`sk-rx-check-btn${checks[check] ? ' is-checked' : ''}`}
              onClick={() => setChecks((previous) => ({ ...previous, [check]: !previous[check] }))}>
              <span className={`sk-rx-check-box${checks[check] ? ' is-checked' : ''}`} aria-hidden="true">{checks[check] ? <Icon name="check-2" size={13} strokeWidth={3} /> : null}</span>
              <span className="pw-rx-check__words"><span className="pw-rx-check__label">{label[check]}</span><span className="pw-rx-check__meta">{meta[check]}</span></span>
            </button>
          ))}
        </div>

        <h3 className="pw-rx-eyebrow">{review ? t('pt.rxr.itemsHeading') : t('pt.rxr.ocrHeading')}</h3>
        {review ? items.map((item) => {
          const on = confirmed.has(item.id);
          return (
            <div key={item.id} className="sk-rx-ocr-card">
              <span className="pw-rx-item__top">
                <span className="pw-rx-item__name">{[item.genericName, item.strength, item.form].filter(Boolean).join(' ')}</span>
                <span className={`pw-flag ${SCHEDULED_CLASSES.has(item.scheduleClass) ? 'pw-flag--attention' : 'pw-flag--info'}`}>{item.scheduleClass}</span>
              </span>
              <span className="pw-rx-item__sig sk-mono">{[itemSig(item), t('partner.vrx.rx.item.qty', { count: item.quantity })].filter(Boolean).join(' · ')}</span>
              {item.registerRequired ? <span className="pw-rx-item__note">{t('partner.vrx.rx.item.register', { cls: item.scheduleClass })}</span> : null}
              {!item.substitutionAllowed ? <span className="pw-rx-item__note">{t('partner.vrx.rx.item.noSubstitution')}</span> : null}
              <label className="pw-check">
                <input type="checkbox" checked={on} onChange={() => setConfirmed((previous) => { const next = new Set(previous); if (next.has(item.id)) next.delete(item.id); else next.add(item.id); return next; })} />
                {t('pt.rxr.confirmItem')}
              </label>
            </div>
          );
        }) : <p className="pw-hint">{t('pt.rxr.ocrNotConnected')}</p>}

        <label className="pw-field">{t('partner.vrx.rx.pharmacistName')}
          <input className="pc-input" type="text" maxLength={120} autoComplete="name" value={pharmacist} onChange={(event) => setPharmacist(event.target.value)} />
          <span className="pw-hint">{t('partner.vrx.rx.pharmacistNameHint')}</span>
        </label>
        {error ? <p className="pc-form__error" role="alert">{error}</p> : null}
        {!canApprove && !expired ? <p id="pw-rx-why" className="pw-hint">{t('pt.rxr.approveWhy')}</p> : null}
        <SkButton disabled={!canApprove} busy={busy && !rejecting} aria-describedby={!canApprove ? 'pw-rx-why' : undefined}
          onClick={() => { void act(() => approveRx(selected.kind, id, pharmacist.trim(), checks), t('partner.vrx.rx.toast.approved', { id: t('pt.rxr.rxId', { ref: refOf(id) }), name: pharmacist.trim() })); }}>
          {t('partner.vrx.rx.approve')}
        </SkButton>
        {rejecting ? (
          <form className="pc-form" onSubmit={(event) => { event.preventDefault(); if (reason.trim()) void act(() => rejectRx(selected.kind, id, reason.trim()), t('partner.vrx.rx.toast.rejected', { id: t('pt.rxr.rxId', { ref: refOf(id) }) })); }}>
            <label className="pw-field">{t('partner.vrx.rx.rejectReason')}
              <textarea className="pc-textarea" required maxLength={300} value={reason} onChange={(event) => setReason(event.target.value)} />
            </label>
            <div className="pc-form__actions">
              <SkButton variant="secondary" disabled={busy} onClick={() => { setRejecting(false); setReason(''); }}>{t('common.cancel')}</SkButton>
              <SkButton type="submit" busy={busy} disabled={!online || busy || !reason.trim()}>{t('partner.vrx.rx.rejectConfirm')}</SkButton>
            </div>
          </form>
        ) : (
          <SkButton variant="secondary" disabled={!online || busy} onClick={() => setRejecting(true)}>{t('partner.vrx.rx.reject')}</SkButton>
        )}
        <p className="pw-hint pw-rx-foot">{t('pt.rxr.substitutionNote')}</p>
      </section>
    </>
  );
}
