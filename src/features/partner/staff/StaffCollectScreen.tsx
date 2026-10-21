import React, { useCallback, useEffect, useId, useState } from 'react';
import { Icon } from '@/design-system/icons';
import { SkButton, Skeleton } from '@/design-system/primitives';
import { useAuth } from '@/data/contexts/AuthContext';
import { useT } from '@/i18n';
import type { RoutePath } from '@/lib/utils/workflowRouting';
import { usePartnerLoad } from '@/features/partner/PartnerPage';
import { advanceLabOrder, loadLabOrders } from '@/features/partner/work/labWork';
import type { LabOrder, LabQueue } from '@/features/partner/work/labWork';
import { bindCounter, memberIdForAccount, useCounterSession, verifiedIn } from '@/features/partner/work/counterSession';
import { useOnline } from '@/features/partner/work/workCopy';
import { StaffPhone, VerifiedBanner } from './StaffPhone';

/**
 * StaffCollect — the staff app's "Collect sample" (design page 6, Tier 1,
 * phone board, approved 2026-10-21).
 *
 * After the student is verified at this device (a live pass and the person
 * matched), it finds that student's assigned booking at this lab
 * (`GET /work/lab-orders?status=ASSIGNED`, matched on the booking's own
 * student) and records the sample with the lab's existing step
 * (`PATCH /lab-orders/{id}` to SAMPLE_COLLECTED with the sample identifier).
 *
 * "Sample collected" stays disabled until: online, this booking's student is
 * the one verified here (and was not stopped), the tube label is entered, and
 * the test needs no fasting. Fasting confirmation is not recorded anywhere yet
 * (approved decision), so a fasting test cannot be collected from this board.
 * Scanning the tube barcode is not connected: the label is typed.
 */

export type CollectSource = (signal: AbortSignal) => Promise<LabQueue>;
const assigned: CollectSource = (signal) => loadLabOrders(signal, 'ASSIGNED');

export function StaffCollectScreen({ onNavigate, source = assigned }: { onNavigate: (route: RoutePath) => void; source?: CollectSource }) {
  const t = useT();
  const { user } = useAuth();
  const online = useOnline();
  const session = useCounterSession();
  useEffect(() => { bindCounter(user?.id ?? ''); }, [user?.id]);
  const current = session.current;
  const load = useCallback((signal: AbortSignal) => source(signal), [source]);
  const bookings = usePartnerLoad<LabQueue>(current ? load : null);
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<string | null>(null);
  const labelField = useId();

  const mine: LabOrder[] = current
    ? (bookings.data?.items ?? []).filter((order) => order.status === 'ASSIGNED' && memberIdForAccount(order.patientId) === current.memberId)
    : [];
  const booking = mine[0] ?? null;
  const verifiedForBooking = booking ? Boolean(verifiedIn(session, booking.patientId)) : false;
  const canCollect = online && !busy && verifiedForBooking && Boolean(booking) && !booking?.fastingRequired && label.trim().length > 0;
  const why = !online ? t('pt.offline.readOnly')
    : !booking ? t('pt.sa.col.whyNoBooking')
      : booking.fastingRequired ? t('pt.sa.col.whyFasting')
        : !label.trim() ? t('pt.sa.col.whyLabel') : '';

  const collect = async () => {
    if (!booking || !canCollect) return;
    setBusy(true);
    setError('');
    try {
      await advanceLabOrder(booking.id, 'SAMPLE_COLLECTED', { sampleId: label.trim() });
      setDone(label.trim());
      setLabel('');
    } catch (reason) {
      setError(reason instanceof Error && reason.message ? reason.message : t('pt.saveFailed'));
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <StaffPhone title={t('pt.sa.col.title')} subtitle={user?.fullName} backLabel={t('pt.sa.back')} onBack={() => onNavigate('run-sheet')}>
        <section className="sa-done" role="status">
          <span className="sa-done__badge" aria-hidden="true"><Icon name="check" size={34} strokeWidth={2.8} /></span>
          <span className="sa-done__title">{t('pt.sa.col.doneTitle', { id: done })}</span>
          <span className="sa-done__body">{t('pt.sa.col.doneBody')}</span>
          <SkButton onClick={() => { setDone(null); onNavigate('staff-verify'); }}>{t('pt.vf.nextStudent')}</SkButton>
        </section>
      </StaffPhone>
    );
  }

  return (
    <StaffPhone
      title={t('pt.sa.col.title')}
      subtitle={user?.fullName}
      backLabel={t('pt.sa.back')}
      onBack={() => onNavigate('run-sheet')}
      footer={current ? (
        <>
          {error ? <p className="sa-foot__note sa-error" role="alert">{error}</p> : null}
          <SkButton disabled={!canCollect} busy={busy} aria-describedby={why ? 'sa-col-why' : undefined} onClick={() => { void collect(); }}>{t('pt.sa.col.collect')}</SkButton>
          {why ? <p id="sa-col-why" className="sa-foot__note">{why}</p> : null}
          <p className="sa-foot__note">{t('pt.sa.col.rule')}</p>
        </>
      ) : undefined}
    >
      <VerifiedBanner current={current} onRecheck={() => onNavigate('staff-verify')} />

      {current ? (
        bookings.status === 'loading' && !bookings.data ? (
          <div className="sa-card" role="status" aria-busy="true" aria-label={t('pt.sa.col.loading')}><Skeleton height={20} width="60%" /><Skeleton height={16} /></div>
        ) : bookings.status === 'error' ? (
          <div className="sa-card" role="alert">
            <span className="sa-card__title">{t('pt.sa.col.errorTitle')}</span>
            <span className="sa-card__meta">{t('console.error.body')}</span>
            <SkButton variant="secondary" onClick={bookings.reload}>{t('common.tryAgain')}</SkButton>
            <span className="sa-card__meta sk-mono">{t('pt.sa.col.ref')}</span>
          </div>
        ) : booking ? (
          <>
            <section className="sa-card" aria-labelledby="sa-booking-title">
              <h2 className="sa-eyebrow">{t('pt.sa.col.booking', { ref: booking.id.slice(0, 8).toUpperCase() })}</h2>
              <span id="sa-booking-title" className="sa-card__title">{booking.testPanel.join(' + ')}</span>
              <span className="sa-card__meta">{booking.fastingRequired ? t('pt.fastingRequired') : t('pt.noFasting')}</span>
              {mine.length > 1 ? <span className="sa-card__meta">{t('pt.sa.col.more', { count: mine.length - 1 })}</span> : null}
            </section>
            {booking.fastingRequired ? <p className="sa-note sa-note--attention" role="status">{t('pt.sa.col.fastingNotConnected')}</p> : null}
            <section className="sa-stack" aria-labelledby="sa-tube-title">
              <h2 id="sa-tube-title" className="sa-eyebrow">{t('pt.sa.col.tubeTitle')}</h2>
              <div className="sa-capture">
                <span className="sa-capture__why">{t('pt.sa.col.scanOff')}</span>
              </div>
              <label className="sa-field" htmlFor={labelField}>{t('pt.sa.col.tubeLabel')}</label>
              <input id={labelField} className="pc-input sa-input" type="text" autoComplete="off" spellCheck={false} maxLength={40} value={label} onChange={(event) => setLabel(event.target.value)} />
            </section>
          </>
        ) : (
          <div className="sa-card" role="status">
            <span className="sa-card__title">{t('pt.sa.col.noneTitle', { name: current.fullName })}</span>
            <span className="sa-card__meta">{t('pt.sa.col.noneBody')}</span>
          </div>
        )
      ) : null}
    </StaffPhone>
  );
}
