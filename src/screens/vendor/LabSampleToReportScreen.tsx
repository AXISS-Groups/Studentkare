import React, { useCallback, useMemo, useState } from 'react';
import { Icon } from '@/design-system/icons';
import { SkButton, Toast } from '@/design-system/primitives';
import { Drawer } from '@/design-system/overlays/Drawer';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { navigate, RoutePath } from '@/lib/utils/workflowRouting';
import { PartnerEmpty, PartnerError, PartnerLoading, PartnerPage, usePartnerLoad } from '@/features/partner/PartnerPage';
import { loadCollectors } from '@/features/partner/partnerApi';
import type { LabCollector } from '@/features/partner/partnerApi';
import {
  advanceLabOrder, criticalOpen, fileLabReport, LAB_STAGES, loadAwaitingCollection, loadLabOrders, slotTime, stageOf,
} from '@/features/partner/work/labWork';
import type { LabOrder, LabQueue, LabStage, OverdueCollection } from '@/features/partner/work/labWork';
import { labStatusKey, minutesAgo, useOnline } from '@/features/partner/work/workCopy';
import '@/features/partner/work/partner-work.css';

/**
 * LabQueue — the lab's sample queue (design page 6, Tier 1, approved 2026-10-21).
 *
 * The board's pipeline (Booked, Collected, Transit, Analysed, Released)
 * drawn from the lab's own live queue (`GET /work/lab-orders`). Opening a card
 * keeps every existing step: assign one of the lab's collectors, record the
 * sample identifier, reject a sample with the reason the student is told, and
 * file the report for a doctor, flagging a critical value with the lab's note.
 *
 * What it does not do (approved decisions, see the WP-15 plan):
 * - The lab never releases a result. The board's "Release critical value now"
 *   is not drawn: a filed critical report goes to the reviewing doctor, first in
 *   their queue, and the banner says so. Calling the clinician and alerting the
 *   campus clinic have no endpoint, so they are not offered.
 * - The critical banner comes only from the lab's own flag on a filed report,
 *   never from a threshold in this client.
 * - "Over transit window" and "Redo rate" have no source: "—".
 * - Offline, the queue stays readable and every write is disabled.
 */

export type LabQueueSource = (signal: AbortSignal) => Promise<LabQueue>;
export type OverdueSource = (signal: AbortSignal) => Promise<{ items: OverdueCollection[] }>;

export interface LabSampleToReportScreenProps {
  source?: LabQueueSource;
  overdueSource?: OverdueSource;
  collectorsSource?: (signal: AbortSignal) => Promise<{ items: LabCollector[] }>;
  onNavigate?: (route: string) => void;
}

interface Loaded {
  queue: LabQueue;
  /** null: the overdue check itself failed; the board says so rather than showing nothing overdue. */
  overdue: Map<string, OverdueCollection> | null;
}

const STAGE_KEY: Record<LabStage, MessageKey> = {
  booked: 'pt.lab.stage.booked',
  collected: 'pt.lab.stage.collected',
  transit: 'pt.lab.stage.transit',
  analysed: 'pt.lab.stage.analysed',
  released: 'pt.lab.stage.released',
};

/** Steps that need one more field than a button. */
type Prompt = 'ASSIGNED' | 'SAMPLE_COLLECTED' | 'SAMPLE_REJECTED' | 'REPORT_READY';
const PROMPTED = new Set<string>(['ASSIGNED', 'SAMPLE_COLLECTED', 'SAMPLE_REJECTED', 'REPORT_READY']);

export function LabSampleToReportScreen({ source = loadLabOrders, overdueSource = loadAwaitingCollection, collectorsSource = loadCollectors, onNavigate }: LabSampleToReportScreenProps) {
  const t = useT();
  const online = useOnline();
  const load = useCallback(async (signal: AbortSignal): Promise<Loaded> => {
    const [queue, overdue] = await Promise.all([
      source(signal),
      overdueSource(signal).then((page) => new Map(page.items.map((item) => [item.id, item])), () => null),
    ]);
    return { queue, overdue };
  }, [source, overdueSource]);
  const loaded = usePartnerLoad<Loaded>(load);
  const [openId, setOpenId] = useState<string | null>(null);
  const [criticalOpenId, setCriticalOpenId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const go = (route: RoutePath) => (onNavigate ? onNavigate(route) : navigate(route));

  const orders = useMemo(() => loaded.data?.queue.items ?? [], [loaded.data]);
  const overdue = loaded.data?.overdue ?? null;
  const columns = useMemo(() => LAB_STAGES.map((stage) => ({ stage, cards: orders.filter((order) => stageOf(order) === stage) })), [orders]);
  const critical = orders.filter(criticalOpen);
  const open = orders.find((order) => order.id === openId) ?? null;
  const openCritical = orders.find((order) => order.id === criticalOpenId) ?? null;

  if (loaded.status === 'loading' && !loaded.data) return <PartnerPage><PartnerLoading label={t('console.loading', { title: t('pt.lab.title') })} tiles={3} /></PartnerPage>;
  if (loaded.status === 'error') {
    return <PartnerPage><PartnerError title={t('pt.lab.errorTitle')} reference={t('pt.lab.ref')} detail={loaded.error || undefined} onRetry={loaded.reload} onHelp={() => go('support')} /></PartnerPage>;
  }
  if (!columns.some((column) => column.cards.length)) {
    return <PartnerPage><PartnerEmpty title={t('pt.lab.emptyTitle')} body={t('pt.lab.emptyBody')} action={{ label: t('pt.lab.emptyAction'), onSelect: () => go('catalogue') }} /></PartnerPage>;
  }

  return (
    <PartnerPage labelledBy="pw-lab-title">
      <header className="pw-head">
        <div className="pw-head__titles">
          <ol className="pw-pipeline" aria-label={t('pt.lab.pipelineLabel')}>
            {LAB_STAGES.map((stage, index) => (
              <li key={stage}>
                {index > 0 ? <Icon name="arrow-right" size={13} strokeWidth={2.4} /> : null}
                {t(STAGE_KEY[stage])}
              </li>
            ))}
          </ol>
          <h1 id="pw-lab-title" className="pw-title">{t('pt.lab.title')}</h1>
        </div>
        <dl className="pw-figures" aria-label={t('pt.lab.figuresLabel')}>
          <div className="pw-figure"><dt>{t('pt.lab.fig.critical')}</dt><dd className={critical.length ? 'is-danger' : undefined}>{critical.length}</dd></div>
          <div className="pw-figure"><dt>{t('pt.lab.fig.transit')}</dt><dd className="is-unknown">—</dd><dd className="pw-figure__meta">{t('pc.notConnected')}</dd></div>
          <div className="pw-figure"><dt>{t('pt.lab.fig.redo')}</dt><dd className="is-unknown">—</dd><dd className="pw-figure__meta">{t('pc.notConnected')}</dd></div>
        </dl>
      </header>

      {critical.map((order) => (
        <section key={order.id} className="pw-critical" role="alert" aria-labelledby={`pw-crit-${order.id}`}>
          <Icon name="alert-triangle" size={22} strokeWidth={2.2} />
          <span className="pw-critical__words">
            <span className="pw-critical__eyebrow">{t('pt.lab.crit.eyebrow')}</span>
            <span id={`pw-crit-${order.id}`} className="pw-critical__title">{t('pt.lab.crit.title', { sample: order.sampleId || '—', note: order.criticalNote })}</span>
            <span className="pw-critical__body">{order.status === 'REPORT_READY' ? t('pt.lab.crit.withDoctor') : t('pt.lab.crit.notAcknowledged')}</span>
          </span>
          <SkButton variant="danger" onClick={() => setCriticalOpenId(order.id)}>{t('pt.lab.crit.open')}</SkButton>
        </section>
      ))}

      {!online ? <p className="pc-note pc-note--attention pc-note__text" role="status">{t('pt.offline.readOnly')}</p> : null}
      {overdue === null ? <p className="pc-note pc-note--attention pc-note__text" role="status">{t('pt.lab.overdueUnavailable')}</p> : null}

      <div className="pw-board">
        {columns.map(({ stage, cards }) => (
          <section key={stage} className="pw-col" aria-labelledby={`pw-col-${stage}`}>
            <div className="pw-col__head">
              <h2 id={`pw-col-${stage}`} className="pw-col__title">{t(STAGE_KEY[stage])}</h2>
              <span className="pw-col__count">{cards.length}</span>
            </div>
            {cards.length === 0 ? <p className="pw-col__empty">{t('pt.lab.colEmpty')}</p> : null}
            {cards.map((order) => <QueueCard key={order.id} order={order} overdue={overdue?.get(order.id) ?? null} onOpen={() => setOpenId(order.id)} />)}
          </section>
        ))}
      </div>

      {open ? (
        <OrderDrawer
          order={open}
          online={online}
          collectorsSource={collectorsSource}
          onClose={() => setOpenId(null)}
          onDone={(message) => { setOpenId(null); setToast(message); loaded.reload(); }}
        />
      ) : null}

      <Drawer
        open={Boolean(openCritical)}
        title={openCritical ? t('pt.lab.crit.title', { sample: openCritical.sampleId || '—', note: openCritical.criticalNote }) : ''}
        eyebrow={t('pt.lab.crit.eyebrow')}
        eyebrowTone="danger"
        subtitle={openCritical ? t('pt.lab.crit.filed', { when: minutesAgo(t, openCritical.updatedAt) }) : undefined}
        onClose={() => setCriticalOpenId(null)}
      >
        {openCritical ? (
          <div className="pw-drawer">
            <p className="pw-hint">{openCritical.status === 'REPORT_READY' ? t('pt.lab.crit.withDoctor') : t('pt.lab.crit.notAcknowledged')}</p>
            <p className="pw-hint">{t('pt.lab.crit.noRelease')}</p>
            <p className="pc-note pc-note--info pc-note__text">{t('pt.lab.crit.escalationNotConnected')}</p>
          </div>
        ) : null}
      </Drawer>

      {toast ? <Toast message={toast} onDone={() => setToast(null)} /> : null}
    </PartnerPage>
  );
}

function QueueCard({ order, overdue, onOpen }: { order: LabOrder; overdue: OverdueCollection | null; onOpen: () => void }) {
  const t = useT();
  const isCritical = criticalOpen(order);
  const slot = slotTime(order.slotStart);
  const meta = [
    order.collectionMode === 'HOME' ? t('admin.fulfil.home') : t('admin.fulfil.walkIn'),
    slot ? t('pt.lab.slotAt', { time: slot }) : null,
    order.collectorName || null,
  ].filter(Boolean).join(' · ');
  const flag = isCritical
    ? { tone: 'danger', label: t('pt.lab.flag.critical') }
    : order.status === 'SAMPLE_REJECTED' || order.status === 'RECOLLECTION_REQUIRED'
      ? { tone: 'attention', label: t('pt.lab.flag.redo') }
      : overdue
        ? { tone: 'attention', label: t('pt.lab.flag.overdue') }
        : order.fastingRequired && stageOf(order) === 'booked'
          ? { tone: 'attention', label: t('pt.lab.flag.fasting') }
          : null;
  const clock = overdue ? t('pt.lab.neverCollected') : minutesAgo(t, order.updatedAt);
  return (
    <button type="button" className={`pw-card${isCritical ? ' is-critical' : ''}`} onClick={onOpen}
      aria-label={t('pt.lab.openCard', { test: order.testPanel.join(', '), status: t(labStatusKey(order.status)) })}>
      <span className="pw-card__top">
        <span className="pw-card__sample">{order.sampleId || '—'}</span>
        {flag ? <span className={`pw-flag pw-flag--${flag.tone}`}>{flag.tone === 'danger' ? <Icon name="alert-triangle" size={12} strokeWidth={2.4} /> : null}{flag.label}</span> : null}
      </span>
      <span className="pw-card__test">{order.testPanel.join(', ')}</span>
      <span className="pw-card__meta">{meta}</span>
      <span className="pw-card__meta">{t(labStatusKey(order.status))}</span>
      <span className={`pw-card__clock${overdue ? ' is-attention' : ''}`}>{clock}</span>
    </button>
  );
}

interface OrderDrawerProps {
  order: LabOrder;
  online: boolean;
  collectorsSource: (signal: AbortSignal) => Promise<{ items: LabCollector[] }>;
  onClose: () => void;
  onDone: (message: string) => void;
}

function OrderDrawer({ order, online, collectorsSource, onClose, onDone }: OrderDrawerProps) {
  const t = useT();
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [value, setValue] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [critical, setCritical] = useState(false);
  const [criticalNote, setCriticalNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const collectorsLoad = useCallback((signal: AbortSignal) => collectorsSource(signal), [collectorsSource]);
  const collectors = usePartnerLoad(prompt === 'ASSIGNED' ? collectorsLoad : null);
  const active = (collectors.data?.items ?? []).filter((collector) => collector.active);
  // A released result is the doctor's; the server never lists REPORT_RELEASED for a lab.
  const steps = order.nextStates.filter((next) => next !== 'REPORT_RELEASED');

  const run = async (action: () => Promise<unknown>, message: string) => {
    if (!online || busy) return;
    setBusy(true);
    setError('');
    try {
      await action();
      onDone(message);
    } catch (reason) {
      setError(reason instanceof Error && reason.message ? reason.message : t('pt.saveFailed'));
    } finally {
      setBusy(false);
    }
  };

  const start = (next: string) => {
    setError('');
    if (PROMPTED.has(next)) { setPrompt(next as Prompt); setValue(''); setFile(null); setCritical(false); setCriticalNote(''); return; }
    void run(() => advanceLabOrder(order.id, next), t('pt.lab.moved', { status: t(labStatusKey(next)) }));
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!prompt) return;
    if (prompt === 'REPORT_READY') {
      if (!file || (critical && criticalNote.trim().length < 3)) return;
      void run(() => fileLabReport(order.id, file, { flag: critical, note: criticalNote }), t('pt.lab.filed'));
      return;
    }
    const text = value.trim();
    if (!text) return;
    const extra = prompt === 'ASSIGNED' ? { collectorId: text } : prompt === 'SAMPLE_COLLECTED' ? { sampleId: text } : { rejectionReason: text };
    void run(() => advanceLabOrder(order.id, prompt, extra), t('pt.lab.moved', { status: t(labStatusKey(prompt)) }));
  };

  const slot = slotTime(order.slotStart);
  return (
    <Drawer open title={order.testPanel.join(', ')} eyebrow={t(labStatusKey(order.status))} subtitle={t('pt.lab.orderRef', { ref: order.id.slice(0, 8).toUpperCase() })} busy={busy} onClose={onClose}>
      <div className="pw-drawer">
        <dl className="pw-facts">
          <dt>{t('pt.lab.fact.sample')}</dt><dd className="sk-mono">{order.sampleId || '—'}</dd>
          <dt>{t('pt.lab.fact.collection')}</dt><dd>{order.collectionMode === 'HOME' ? t('admin.fulfil.home') : t('admin.fulfil.walkIn')}{slot ? ` · ${slot}` : ''}</dd>
          <dt>{t('pt.lab.fact.fasting')}</dt><dd>{order.fastingRequired ? t('pt.fastingRequired') : t('pt.noFasting')}</dd>
          {order.collectorName ? <><dt>{t('pt.lab.fact.collector')}</dt><dd>{order.collectorName}</dd></> : null}
          {order.rejectionReason ? <><dt>{t('pt.lab.fact.rejected')}</dt><dd>{order.rejectionReason}</dd></> : null}
          {order.criticalFlag ? <><dt>{t('pt.lab.fact.critical')}</dt><dd>{order.criticalNote}</dd></> : null}
        </dl>

        {order.status === 'REPORT_READY' ? <p className="pw-hint">{t('admin.fulfil.withDoctor')}</p> : null}
        {order.status === 'REPORT_RELEASED' ? <p className="pw-hint">{t('admin.fulfil.released')}</p> : null}

        {!prompt ? (
          steps.length ? (
            <div className="pw-actions" role="group" aria-label={t('pt.lab.stepsLabel')}>
              {steps.map((next) => (
                <SkButton key={next} variant={next === 'SAMPLE_REJECTED' || next === 'CANCELLED' ? 'secondary' : 'primary'} disabled={!online || busy} onClick={() => start(next)}>
                  {next === 'REPORT_READY' ? t('admin.fulfil.fileReport') : t(labStatusKey(next, 'action'))}
                </SkButton>
              ))}
            </div>
          ) : order.status !== 'REPORT_READY' && order.status !== 'REPORT_RELEASED' ? <p className="pw-hint">{t('admin.fulfil.noFurther')}</p> : null
        ) : (
          <form className="pc-form" onSubmit={submit}>
            {prompt === 'ASSIGNED' ? (
              <label className="pw-field">
                {t('pt.lab.collectorLabel')}
                <select className="pc-select" required value={value} onChange={(event) => setValue(event.target.value)} disabled={collectors.status === 'loading'}>
                  <option value="">{collectors.status === 'loading' ? t('pt.loadingShort') : t('pt.lab.collectorChoose')}</option>
                  {active.map((collector) => <option key={collector.accountId} value={collector.accountId}>{collector.fullName}</option>)}
                </select>
                {collectors.status === 'ready' && active.length === 0 ? <span className="pw-hint">{t('pt.lab.noCollectors')}</span> : null}
                {collectors.status === 'error' ? <span className="pc-form__error" role="alert">{t('pt.lab.collectorsFailed')}</span> : null}
              </label>
            ) : null}
            {prompt === 'SAMPLE_COLLECTED' ? (
              <label className="pw-field">{t('admin.fulfil.collectedLabel')}
                <input className="pc-input" required maxLength={40} value={value} onChange={(event) => setValue(event.target.value)} />
                <span className="pw-hint">{t('admin.fulfil.collectedHint')}</span>
              </label>
            ) : null}
            {prompt === 'SAMPLE_REJECTED' ? (
              <label className="pw-field">{t('admin.fulfil.sampleRejectedLabel')}
                <textarea className="pc-textarea" required maxLength={300} value={value} onChange={(event) => setValue(event.target.value)} />
                <span className="pw-hint">{t('admin.fulfil.sampleRejectedHint')}</span>
              </label>
            ) : null}
            {prompt === 'REPORT_READY' ? (
              <>
                <p className="pw-hint">{t('admin.fulfil.fileHint')}</p>
                <label className="pw-field">{t('admin.fulfil.reportFile')}
                  <input className="pc-input" type="file" required accept="application/pdf,image/png,image/jpeg" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
                </label>
                <label className="pw-check">
                  <input type="checkbox" checked={critical} onChange={(event) => setCritical(event.target.checked)} />
                  {t('admin.fulfil.criticalCheck')}
                </label>
                {critical ? (
                  <label className="pw-field">{t('admin.fulfil.criticalNoteLabel')}
                    <input className="pc-input" required minLength={3} maxLength={500} value={criticalNote} onChange={(event) => setCriticalNote(event.target.value)} />
                  </label>
                ) : null}
              </>
            ) : null}
            {error ? <p className="pc-form__error" role="alert">{error}</p> : null}
            <div className="pc-form__actions">
              <SkButton variant="secondary" disabled={busy} onClick={() => { setPrompt(null); setError(''); }}>{t('common.cancel')}</SkButton>
              <SkButton type="submit" busy={busy}
                disabled={!online || busy || (prompt === 'REPORT_READY' ? !file || (critical && criticalNote.trim().length < 3) : !value.trim())}>
                {prompt === 'REPORT_READY' ? t('admin.fulfil.sendForReview') : t('admin.work.confirm')}
              </SkButton>
            </div>
          </form>
        )}
        {!prompt && error ? <p className="pc-form__error" role="alert">{error}</p> : null}
        {!online ? <p className="pw-hint" role="status">{t('pt.offline.readOnly')}</p> : null}
      </div>
    </Drawer>
  );
}
