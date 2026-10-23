import React, { useCallback, useEffect, useMemo } from 'react';
import { ConsoleTablePage } from '@/design-system/console/ConsoleTablePage';
import type { ConsoleTableStatus } from '@/design-system/console/ConsoleTablePage';
import type { DataTableRow } from '@/design-system/data/DataTable';
import type { SkTone } from '@/design-system/primitives';
import { SkButton } from '@/design-system/primitives';
import { Icon } from '@/design-system/icons';
import { useAuth } from '@/data/contexts/AuthContext';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { navigate, RoutePath } from '@/lib/utils/workflowRouting';
import { PARTNER_EMPTY_TILE, usePartnerLoad } from '@/features/partner/PartnerPage';
import { bySlot, COLLECTION_STATES, loadLabOrders, slotTime } from '@/features/partner/work/labWork';
import type { LabOrder, LabQueue } from '@/features/partner/work/labWork';
import { bindCounter, useCounterSession, verifiedIn } from '@/features/partner/work/counterSession';
import '@/features/partner/work/partner-work.css';

/**
 * LabCollection — the run sheet (design page 6, Tier 1, approved 2026-10-21).
 *
 * The lab's stops still to collect, from its own queue (`GET /work/lab-orders`:
 * booked, assigned, recollection needed, collected), in slot order. It used to
 * draw only what a caller passed in, so it was empty in the app.
 *
 * The next stop keeps the board's order: verify the student, then the tube,
 * then collect. "Verify on phone" opens the staff scanner and "Tube step" the
 * staff app's collect board, where the sample is recorded; this page never
 * collects on its own. The steps tick from this tab's counter session (a live
 * pass the staff member matched), never from the client's say-so.
 *
 * Left out, honestly: "Close run" (no run model), the phlebotomist's name on
 * the run, the student's name and room (the lab payload carries neither), the
 * fasting-since time (not recorded), and "Median per stop" ("—").
 */

export type RunSheetSource = (signal: AbortSignal) => Promise<LabQueue>;

const STATUS: Record<string, { key: MessageKey; tone: SkTone }> = {
  BOOKED: { key: 'pt.run.state.booked', tone: 'neutral' },
  ASSIGNED: { key: 'pt.run.state.scheduled', tone: 'neutral' },
  RECOLLECTION_REQUIRED: { key: 'pt.run.state.reschedule', tone: 'attention' },
  SAMPLE_REJECTED: { key: 'pt.run.state.reschedule', tone: 'attention' },
  SAMPLE_COLLECTED: { key: 'pt.run.state.collected', tone: 'positive' },
};

export function LabCollectionScreen({ source = loadLabOrders, onNavigate }: { source?: RunSheetSource; onNavigate?: (route: string) => void; onLogout?: () => void }) {
  const t = useT();
  const { user } = useAuth();
  const session = useCounterSession();
  useEffect(() => { bindCounter(user?.id ?? ''); }, [user?.id]);
  const load = useCallback((signal: AbortSignal) => source(signal), [source]);
  const sheet = usePartnerLoad<LabQueue>(load);
  const go = (route: RoutePath) => (onNavigate ? onNavigate(route) : navigate(route));

  const stops = useMemo(() => (sheet.data?.items ?? []).filter((order) => COLLECTION_STATES.has(order.status)).sort(bySlot), [sheet.data]);
  const next = stops.find((order) => order.status === 'ASSIGNED') ?? null;
  const status: ConsoleTableStatus = sheet.status === 'loading' && !sheet.data ? 'loading' : sheet.status === 'error' ? 'error' : 'ready';
  const collected = stops.filter((order) => order.status === 'SAMPLE_COLLECTED').length;
  const reschedule = stops.filter((order) => order.status === 'RECOLLECTION_REQUIRED' || order.status === 'SAMPLE_REJECTED').length;
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  const rows: DataTableRow[] = stops.map((order) => {
    const state = order.id === next?.id ? { key: 'pt.run.state.next' as MessageKey, tone: 'action' as SkTone } : STATUS[order.status] ?? STATUS.BOOKED;
    return {
      id: order.id,
      cells: [
        { text: slotTime(order.slotStart) ?? '—', weight: 'strong', mono: true },
        { text: order.collectionAddress || (order.collectionMode === 'HOME' ? t('admin.fulfil.home') : t('admin.fulfil.walkIn')), weight: 'regular' },
        { text: order.testPanel.join(', '), sub: t('pt.lab.orderRef', { ref: order.id.slice(0, 8).toUpperCase() }), weight: 'strong' },
        { text: order.fastingRequired ? t('pt.fastingRequired') : t('pt.noFasting'), weight: 'muted' },
        { pill: { label: t(state.key), tone: state.tone } },
      ],
    };
  });

  return (
    <main className="sk-ds pc-page">
      <ConsoleTablePage
        status={status}
        header={{ title: t('pt.run.title'), subtitle: user?.fullName ? t('pt.run.subFor', { date: today, lab: user.fullName }) : today }}
        note={status === 'ready' ? <NextStop order={next} verified={next ? Boolean(verifiedIn(session, next.patientId)) : false} onVerify={() => go('staff-verify')} onTube={() => go('staff-collect')} /> : undefined}
        stats={[
          { label: t('pt.run.stat.stops'), value: String(stops.length) },
          { label: t('pt.run.stat.collected'), value: String(collected), tone: collected ? 'positive' : 'text' },
          { label: t('pt.run.stat.reschedule'), value: String(reschedule), tone: reschedule ? 'attention' : 'text' },
          { label: t('pt.run.stat.median'), value: null },
        ]}
        statsLabel={t('pt.run.statsLabel')}
        table={{
          caption: t('pt.run.caption'),
          columns: [
            { label: t('pt.run.col.time'), width: '96px' },
            { label: t('pt.run.col.location'), width: '200px' },
            { label: t('pt.run.col.test') },
            { label: t('pt.run.col.prep'), width: '200px' },
            { label: t('pt.run.col.status'), width: '200px', align: 'end' },
          ],
          rows,
          footnote: t('pt.run.footnote'),
        }}
        empty={{ title: t('pt.run.emptyTitle'), body: t('pt.run.emptyBody'), icon3d: PARTNER_EMPTY_TILE, action: { label: t('pt.run.emptyAction'), onSelect: () => go('lab-queue') } }}
        unconnected={{ title: t('pt.run.emptyTitle'), body: t('pt.run.emptyBody') }}
        error={{ title: t('pt.run.errorTitle'), reference: t('pt.run.ref'), detail: sheet.error || undefined, onRetry: sheet.reload, onHelp: () => go('support') }}
        loadingLabel={t('console.loading', { title: t('pt.run.title') })}
      />
    </main>
  );
}

/** The board's "Next stop" card: one stop, the order of steps, and where each happens. */
function NextStop({ order, verified, onVerify, onTube }: { order: LabOrder | null; verified: boolean; onVerify: () => void; onTube: () => void }) {
  const t = useT();
  if (!order) {
    return (
      <section className="pw-now is-empty" aria-labelledby="pw-next-title">
        <span className="pw-now__words">
          <span className="pw-now__eyebrow">{t('pt.run.next.eyebrow')}</span>
          <span id="pw-next-title" className="pw-now__title">{t('pt.run.next.none')}</span>
          <span className="pw-now__meta">{t('pt.run.next.noneBody')}</span>
        </span>
      </section>
    );
  }
  const test = order.testPanel.join(', ');
  return (
    <section className="pw-now" aria-labelledby="pw-next-title">
      <span className="pw-now__avatar" aria-hidden="true">
        <Icon name="flask" size={24} strokeWidth={2} />
        {verified ? <span className="pw-now__tick"><Icon name="check" size={12} strokeWidth={3} /></span> : null}
      </span>
      <span className="pw-now__words">
        <span className="pw-now__eyebrow">{t('pt.run.next.eyebrow')}</span>
        <span id="pw-next-title" className="pw-now__title">{[test, order.collectionAddress].filter(Boolean).join(' · ')}</span>
        <span className="pw-now__meta">{t('pt.run.next.order')}</span>
      </span>
      <ol className="pw-steps" aria-label={t('pt.run.next.stepsLabel')}>
        <li className={`pw-step ${verified ? 'is-done' : 'is-current'}`}>
          {verified ? <Icon name="check" size={13} strokeWidth={2.6} /> : <span className="pw-step__dot" aria-hidden="true" />}
          {t('pt.run.step.verify')}{verified ? <span className="sk-visually-hidden">{t('pt.step.done')}</span> : null}
        </li>
        <li className={`pw-step${verified ? ' is-current' : ''}`}><span className="pw-step__dot" aria-hidden="true" />{t('pt.run.step.tube')}</li>
        <li className="pw-step"><span className="pw-step__dot" aria-hidden="true" />{t('pt.run.step.collect')}</li>
      </ol>
      <span className="pw-now__actions">
        <SkButton onClick={onVerify}>{t('pt.run.next.verify')}</SkButton>
        <SkButton variant="secondary" onClick={onTube}>{t('pt.run.next.tube')}</SkButton>
      </span>
    </section>
  );
}
