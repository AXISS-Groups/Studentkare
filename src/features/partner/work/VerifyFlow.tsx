import React, { useEffect, useId, useState } from 'react';
import { Icon, Illustration } from '@/design-system/icons';
import { ApiError, apiRequest } from '@/data/services/http';
import type { IdentitySummary } from '@/data/types/workflowTypes';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { isStopped, recordMismatch, recordVerified, clearCurrent } from './counterSession';
import type { VisitContext } from './counterSession';
import { initials, useOnline } from './workCopy';
import './verify-flow.css';

/**
 * The counter check, shared by the counter tablet (WebScanVerify) and the
 * staff app phone board (ScanVerify). Tier 1, approved 2026-10-21.
 *
 * Rules that do not change: only a 200 from `POST /identity/verify` (a live
 * 30-second step, single use, audited by the server) moves past the scan; every
 * failure, stale code, rate limit, server error and offline state stops the
 * counter. The person decides "same person" or "not the same"; nothing is
 * matched automatically, and there is no photo on file to compare against, so
 * the staff member compares the person with their college ID card. "Not the
 * same" stops that student for the rest of this session (counterSession).
 *
 * Not connected (approved decisions): camera scanning, the live photo and any
 * match hint (a biometric decision under DPDP), the roll-number lookup,
 * flagging and notifying the student, and verifying offline against a pass
 * signature held on the device (offline is never a pass).
 */

export type VerifyStep = 'scan' | 'manual' | 'found' | 'compare' | 'ok' | 'mismatch' | 'expired' | 'notFound' | 'rateLimited' | 'error' | 'unavailable' | 'stoppedBefore';

export const VISIT_CONTEXTS: VisitContext[] = ['pharmacy', 'lab', 'clinic', 'camp'];

export const CONTEXT_COPY: Record<VisitContext, { pill: MessageKey; label: MessageKey; meta: MessageKey; next: MessageKey; ok: MessageKey }> = {
  pharmacy: { pill: 'partner.vsub.scan.ctx.pharmacy', label: 'partner.vsub.scan.ctx.pharmacyLabel', meta: 'partner.vsub.scan.ctx.pharmacyMeta', next: 'partner.vsub.scan.ctx.pharmacyNext', ok: 'partner.vsub.scan.ctx.pharmacyOk' },
  lab: { pill: 'partner.vsub.scan.ctx.lab', label: 'partner.vsub.scan.ctx.labLabel', meta: 'partner.vsub.scan.ctx.labMeta', next: 'partner.vsub.scan.ctx.labNext', ok: 'partner.vsub.scan.ctx.labOk' },
  clinic: { pill: 'partner.vsub.scan.ctx.clinic', label: 'partner.vsub.scan.ctx.clinicLabel', meta: 'partner.vsub.scan.ctx.clinicMeta', next: 'partner.vsub.scan.ctx.clinicNext', ok: 'partner.vsub.scan.ctx.clinicOk' },
  camp: { pill: 'partner.vsub.scan.ctx.camp', label: 'partner.vsub.scan.ctx.campLabel', meta: 'partner.vsub.scan.ctx.campMeta', next: 'partner.vsub.scan.ctx.campNext', ok: 'partner.vsub.scan.ctx.campOk' },
};

const CAMPUS_LABEL: Record<IdentitySummary['campusStatus'], MessageKey> = {
  VERIFIED: 'member.digitalId.campus.VERIFIED',
  PENDING: 'member.digitalId.campus.PENDING',
  NOT_SUBMITTED: 'member.digitalId.campus.NOT_SUBMITTED',
  REJECTED: 'member.digitalId.campus.REJECTED',
};

type Reason = 'different' | 'unclear' | 'refused';
const REASONS: Reason[] = ['different', 'unclear', 'refused'];

/** Maps a status code to what the counter sees. Anything unexpected is an error: never a pass. */
export function failureStep(error: unknown): VerifyStep {
  const status = error instanceof ApiError ? error.status : 0;
  if (status === 410) return 'expired';
  if (status === 404) return 'notFound';
  if (status === 429) return 'rateLimited';
  return 'error';
}

export type VerifyCall = (body: { code: string; memberId: string }) => Promise<IdentitySummary>;
const verifyOnServer: VerifyCall = (body) => apiRequest<IdentitySummary>('/identity/verify', { method: 'POST', body: JSON.stringify(body) });

export interface VerifyFlowProps {
  context: VisitContext;
  /** `phone`: the staff app board at ≤ 430 px; `counter`: the counter tablet. */
  layout: 'phone' | 'counter';
  /** Where "continue" goes after a verified match, per visit type. */
  onContinue: (context: VisitContext) => void;
  verify?: VerifyCall;
  /** Lets a page show the step (e.g. a heading change); optional. */
  onStep?: (step: VerifyStep) => void;
}

export function VerifyFlow({ context, layout, onContinue, verify = verifyOnServer, onStep }: VerifyFlowProps) {
  const t = useT();
  const online = useOnline();
  const [step, setStepState] = useState<VerifyStep>('scan');
  const [memberId, setMemberId] = useState('');
  const [code, setCode] = useState('');
  const [roll, setRoll] = useState('');
  const [cardSeen, setCardSeen] = useState(false);
  const [checking, setChecking] = useState(false);
  const [hint, setHint] = useState('');
  const [student, setStudent] = useState<IdentitySummary | null>(null);
  const [reason, setReason] = useState<Reason | null>(null);
  const memberField = useId();
  const codeField = useId();
  const rollField = useId();
  const setStep = (next: VerifyStep) => { setStepState(next); onStep?.(next); };

  // Going offline mid-check stops it: nothing is verified or queued offline.
  useEffect(() => {
    if (!online && (step === 'found' || step === 'compare')) setStepState('unavailable');
  }, [online, step]);

  const restart = () => {
    clearCurrent();
    setStudent(null); setCode(''); setMemberId(''); setRoll(''); setCardSeen(false); setReason(null); setHint('');
    setStep('scan');
  };

  const check = async () => {
    if (checking) return;
    if (!/^[0-9]{6}$/.test(code)) { setHint(t('partner.vsub.scan.toast.sixDigits')); return; }
    const member = memberId.trim().toUpperCase();
    if (!/^SK-\S+$/.test(member)) { setHint(t('partner.vsub.scan.toast.memberId')); return; }
    setHint('');
    clearCurrent();
    setStudent(null);
    if (!online) { setStep('unavailable'); return; }
    setChecking(true);
    try {
      const result = await verify({ code, memberId: member });
      if (!result || typeof result.fullName !== 'string' || !result.fullName.trim() || !result.memberId) { setStep('error'); return; }
      setStudent(result);
      setStep(isStopped(result.memberId) ? 'stoppedBefore' : 'found');
    } catch (error) {
      setStep(failureStep(error));
    } finally {
      setChecking(false);
    }
  };

  const same = () => {
    if (!student || !online) { setStep('unavailable'); return; }
    const ok = recordVerified({ memberId: student.memberId, fullName: student.fullName, university: student.university, rollNumber: student.rollNumber, campusStatus: student.campusStatus, context, verifiedAt: Date.now() });
    setStep(ok ? 'ok' : 'stoppedBefore');
  };

  const notSame = () => {
    recordMismatch(student?.memberId ?? '', student?.fullName ?? t('partner.vsub.scan.unknownPass'), Date.now());
    setStep('mismatch');
  };

  const copy = CONTEXT_COPY[context];
  const camera = (mode: 'pass' | 'face') => (
    <div className={`vf-camera vf-camera--${layout}`} role="img" aria-label={mode === 'pass' ? t('pt.vf.cameraPassLabel') : t('pt.vf.cameraFaceLabel')}>
      {mode === 'pass' ? <span className="vf-reticle" aria-hidden="true"><span /><span /><span /><span /></span> : <Illustration name="illustration-face-oval-guide" size={layout === 'phone' ? 150 : 170} />}
      <span className="vf-camera__text">{mode === 'pass' ? t('pt.vf.cameraOff') : t('pt.vf.photoOff')}</span>
    </div>
  );

  return (
    <div className={`vf vf--${layout}`}>
      {!online ? (
        <div className="vf-offline" role="alert">
          <Icon name="wifi-off" size={18} strokeWidth={2.2} />
          <span><strong>{t('partner.vsub.scan.offline.title')}</strong> — {t('pt.vf.offlineBody')}</span>
        </div>
      ) : null}

      {step === 'scan' ? (
        <div className="vf-stack">
          {camera('pass')}
          <label className="vf-field" htmlFor={memberField}>{t('pt.vf.memberLabel')}</label>
          <input id={memberField} className="vf-input" type="text" autoComplete="off" spellCheck={false} maxLength={90} placeholder={t('pt.vf.memberPlaceholder')} value={memberId} onChange={(event) => setMemberId(event.target.value)} />
          <div className="vf-code-row">
            <label className="sk-visually-hidden" htmlFor={codeField}>{t('partner.vsub.scan.codeLabel')}</label>
            <input id={codeField} className="vf-input vf-input--code" type="text" inputMode="numeric" autoComplete="off" placeholder={t('pt.vf.codePlaceholder')}
              value={code} onChange={(event) => setCode(event.target.value.replace(/[^0-9]/g, '').slice(0, 6))} />
            <button type="button" className="vf-btn vf-btn--soft" disabled={checking || !online} aria-busy={checking} onClick={() => { void check(); }}>
              {checking ? t('partner.vsub.scan.checking') : t('partner.vsub.scan.check')}
            </button>
          </div>
          {hint ? <p className="vf-hint vf-hint--warn" role="status">{hint}</p> : null}
          <p className="vf-hint">{t('pt.vf.typeHint')}</p>
          <button type="button" className="vf-link" onClick={() => setStep('manual')}>{t('pt.vf.noPhone')}<Icon name="arrow-right" size={15} strokeWidth={2.4} /></button>
        </div>
      ) : null}

      {step === 'manual' ? (
        <div className="vf-stack">
          <p className="vf-callout"><strong>{t('partner.vsub.scan.manual.title')}</strong> — {t('partner.vsub.scan.manual.body')}</p>
          <label className="vf-field" htmlFor={rollField}>{t('partner.vsub.scan.manual.rollLabel')}</label>
          <input id={rollField} className="vf-input" type="text" placeholder={t('partner.vsub.scan.manual.rollPlaceholder')} value={roll} onChange={(event) => setRoll(event.target.value.toUpperCase().slice(0, 20))} />
          <label className="vf-check"><input type="checkbox" checked={cardSeen} onChange={(event) => setCardSeen(event.target.checked)} />{t('partner.vsub.scan.manual.cardSeen')}</label>
          <button type="button" className="vf-btn" disabled={!roll.trim() || !cardSeen} onClick={() => setStep('unavailable')}>{t('partner.vsub.scan.manual.find')}</button>
          <button type="button" className="vf-link vf-link--muted" onClick={() => setStep('scan')}>{t('partner.vsub.scan.backToScan')}</button>
        </div>
      ) : null}

      {step === 'expired' ? (
        <div className="vf-card vf-card--attention" role="alert">
          <strong className="vf-card__title">{t('partner.vsub.scan.expired.title')}</strong>
          <span className="vf-card__body">{t('partner.vsub.scan.expired.body')}</span>
          <button type="button" className="vf-btn" onClick={() => { setCode(''); setStep('scan'); }}>{t('partner.vsub.scan.expired.again')}</button>
        </div>
      ) : null}

      {step === 'notFound' || step === 'rateLimited' || step === 'error' ? (
        <div className="vf-card vf-card--stop" role="alert">
          <strong className="vf-card__title">{t(step === 'notFound' ? 'partner.vsub.scan.notFound.title' : step === 'rateLimited' ? 'partner.vsub.scan.rateLimited.title' : 'partner.vsub.scan.error.title')}</strong>
          <span className="vf-card__body">{t(step === 'notFound' ? 'partner.vsub.scan.notFound.body' : step === 'rateLimited' ? 'partner.vsub.scan.rateLimited.body' : 'partner.vsub.scan.error.body')}</span>
          <button type="button" className="vf-btn" onClick={() => { setCode(''); setStep('scan'); }}>{t('partner.vsub.scan.tryAgain')}</button>
        </div>
      ) : null}

      {step === 'unavailable' ? (
        <div className="vf-card vf-card--stop" role="alert">
          <strong className="vf-card__title">{online ? t('partner.vsub.scan.unavailable.title') : t('partner.vsub.scan.offline.title')}</strong>
          <span className="vf-card__body">{online ? t('partner.vsub.scan.unavailable.body') : t('partner.vsub.scan.offline.body')}</span>
          <button type="button" className="vf-btn" onClick={restart}>{t('partner.vsub.scan.backToScan')}</button>
        </div>
      ) : null}

      {step === 'stoppedBefore' ? (
        <div className="vf-card vf-card--stop" role="alert">
          <strong className="vf-card__title">{t('pt.vf.stoppedBefore.title')}</strong>
          <span className="vf-card__body">{t('pt.vf.stoppedBefore.body')}</span>
          <button type="button" className="vf-btn" onClick={restart}>{t('partner.vsub.scan.backToScan')}</button>
        </div>
      ) : null}

      {step === 'found' && student ? (
        <div className="vf-stack">
          <div className="vf-student">
            <span className="vf-student__avatar" aria-hidden="true">{initials(student.fullName)}</span>
            <span className="vf-student__words">
              <span className="vf-student__tag">{t('pt.vf.liveTag')}</span>
              <span className="vf-student__name">{student.fullName}</span>
              <span className="vf-student__meta">{student.university || t('member.digitalId.campusMissing')} · {student.rollNumber || t('member.digitalId.rollMissing')}</span>
              <span className="vf-student__meta">{t(CAMPUS_LABEL[student.campusStatus] ?? 'member.digitalId.campus.NOT_SUBMITTED')}</span>
            </span>
          </div>
          <div className="vf-visit">
            <span className="vf-field">{t('pt.vf.thisVisit')}</span>
            <span className="vf-visit__title">{t(copy.label)}</span>
            <span className="vf-visit__meta">{t(copy.meta)}</span>
          </div>
          <button type="button" className="vf-btn" onClick={() => setStep('compare')}>{t('pt.vf.compare')}</button>
          <p className="vf-hint">{t('partner.vsub.scan.found.identityOnly')}</p>
        </div>
      ) : null}

      {step === 'compare' && student ? (
        <div className="vf-stack">
          {camera('face')}
          <p className="vf-hint">{t('partner.vsub.scan.compare.noPhoto')}</p>
          <div className="vf-meter">
            <span className="vf-meter__row"><span>{t('partner.vsub.scan.compare.hint')}</span><span>{t('partner.vsub.scan.compare.noHint')}</span></span>
            <span className="vf-hint">{t('partner.vsub.scan.compare.youDecide')}</span>
          </div>
          <p className="vf-question" id="vf-question">{t('pt.vf.question', { name: student.fullName })}</p>
          <div className="vf-decide" role="group" aria-labelledby="vf-question">
            <button type="button" className="vf-decide__btn vf-decide__btn--no" onClick={notSame}>{t('partner.vsub.scan.compare.notSame')}</button>
            <button type="button" className="vf-decide__btn vf-decide__btn--yes" onClick={same}>{t('partner.vsub.scan.compare.same')}</button>
          </div>
        </div>
      ) : null}

      {step === 'ok' && student ? (
        <div className="vf-card vf-card--ok" role="status">
          <span className="vf-ok__badge" aria-hidden="true"><Icon name="check" size={34} strokeWidth={2.8} /></span>
          <strong className="vf-card__title">{t('partner.vsub.scan.ok.title', { name: student.fullName })}</strong>
          <span className="vf-card__body">{t(copy.ok)}</span>
          <button type="button" className="vf-btn" onClick={() => onContinue(context)}>{t(copy.next)}<Icon name="arrow-right" size={16} strokeWidth={2.4} /></button>
          <button type="button" className="vf-link" onClick={restart}>{t('partner.vsub.scan.ok.another')}</button>
        </div>
      ) : null}

      {step === 'mismatch' ? (
        <div className="vf-card vf-card--stop" role="alert">
          <strong className="vf-card__title">{t('partner.vsub.scan.stop.title')}</strong>
          <span className="vf-card__body">{t('pt.vf.stopBody')}</span>
          <span className="vf-field">{t('partner.vsub.scan.stop.what')}</span>
          <div className="vf-reasons" role="radiogroup" aria-label={t('partner.vsub.scan.stop.what')}>
            {REASONS.map((option) => (
              <button key={option} type="button" role="radio" aria-checked={reason === option} className={`vf-reason${reason === option ? ' is-on' : ''}`} onClick={() => setReason(option)}>
                {t(option === 'different' ? 'partner.vsub.scan.why.different' : option === 'unclear' ? 'pt.vf.why.unclear' : 'pt.vf.why.refused')}
              </button>
            ))}
          </div>
          <button type="button" className="vf-btn vf-btn--danger" disabled aria-describedby="vf-flag-why">{t('pt.vf.flag')}</button>
          <span id="vf-flag-why" className="vf-hint">{t('pt.vf.flagWhy')}</span>
          <button type="button" className="vf-link" onClick={restart}>{t('pt.vf.nextStudent')}</button>
        </div>
      ) : null}
    </div>
  );
}
