import React, { useEffect, useId, useState } from 'react';
import { actionBound, computed, makeObservable, observable } from 'mobx';
import { observer } from 'mobx-react-lite';
import { ConsultCallPanel } from '@/components/health/consult/ConsultCallPanel';
import { ConfirmDialog, SkButton, SkSkeleton as Skeleton, StatusPill, Tabs, SkToast as Toast, useOnline } from '@/design-system';
import { Icon } from '@/design-system/icons';
import { useT } from '@/i18n';
import { navigate } from '@/lib/utils/workflowRouting';
import type { RoutePath } from '@/lib/utils/workflowRouting';
import { ClinicianConsoleFrame } from '../shared/ClinicianConsoleFrame';
import { ClinicianEmptyState, ClinicianErrorState } from '../shared/ClinicianStates';
import { LoadableViewModel } from '../shared/LoadableViewModel';
import { OfflineNote } from '../shared/OfflineNote';
import { slotLabel } from '../shared/clinicalData';
import type { T } from '../shared/clinicalData';
import { handOff, takeHandoff } from '../shared/handoff';
import { REVIEW_ROUTES } from '../shared/reviewRoutes';
import { SOAP_KEYS } from '../encounter-note/encounterModel';
import { consultApiSource } from './consultModel';
import type { ConsultData, ConsultSource } from './consultModel';
import './consult-room.css';

export type ConsultTab = 'records' | 'notes' | 'prescription';

export interface EndCheck { id: 'note' | 'rx' | 'allergy'; done: boolean }

/**
 * ClinicianConsultRoom (design page 5). Tier 1, approved by Krishna
 * Chintakayala on 2026-10-21. Every end-of-call check is computed from the
 * server's records, never asserted.
 */
export class ConsultRoomViewModel extends LoadableViewModel<ConsultData> {
  tab: ConsultTab = 'records';
  confirmingEnd = false;
  ended = false;
  online = true;
  private readonly wanted: { id: string | null };

  constructor(private readonly source: ConsultSource, private readonly t: T, preferredAppointment: string | null = null) {
    const wanted = { id: preferredAppointment };
    super({ load: () => source.load(wanted.id) });
    this.wanted = wanted;
    makeObservable(this, {
      tab: observable, confirmingEnd: observable, ended: observable, online: observable,
      checks: computed,
      setTab: actionBound, askEnd: actionBound, cancelEnd: actionBound, end: actionBound, setOnline: actionBound,
    });
  }

  /** Connected with no confirmed appointment: nothing to open. */
  protected isEmpty(data: ConsultData): boolean {
    return data.current === null;
  }

  setOnline(online: boolean): void { this.online = online; }
  setTab(tab: ConsultTab): void { this.tab = tab; }

  /** Open another of today's confirmed appointments. */
  async choose(appointmentId: string): Promise<void> {
    if (this.ended) return;
    this.wanted.id = appointmentId;
    await this.load();
  }

  get checks(): EndCheck[] {
    const d = this.data;
    if (!d) return [];
    const checks: EndCheck[] = [
      { id: 'note', done: d.note?.status === 'FINAL' },
      { id: 'rx', done: d.prescriptions.length > 0 },
    ];
    // The allergy line only means something when there is a prescription to check.
    if (d.prescriptions.length > 0) checks.push({ id: 'allergy', done: d.prescriptions.every((p) => typeof p.allergyCheck.checkedAt === 'number') });
    return checks;
  }

  askEnd(): void { this.confirmingEnd = true; }
  cancelEnd(): void { this.confirmingEnd = false; }

  /** Leaves the call: the call panel unmounts and disconnects. Nothing on the server is closed by it. */
  end(): void {
    this.confirmingEnd = false;
    this.ended = true;
    this.say(this.t('clinConsult.toast.left'));
  }

  async joinAsProvider(): Promise<void> {
    const join = this.source.joinAsProvider;
    const id = this.data?.current?.id;
    if (!join || !id) throw new Error(this.t('clinConsult.cannotJoin'));
    if (!this.online) throw new Error(this.t('clinShared.offlineWrite'));
    await join(id);
  }
}

const SOAP_LABEL = { subjective: 'clinNote.subjective', objective: 'clinNote.objective', assessment: 'clinNote.assessment', plan: 'clinNote.plan' } as const;

const CHECK_KEYS = {
  note: { done: 'clinConsult.check.noteDone', missing: 'clinConsult.check.noteMissing' },
  rx: { done: 'clinConsult.check.rxDone', missing: 'clinConsult.check.rxNone' },
  allergy: { done: 'clinConsult.check.allergyDone', missing: 'clinConsult.check.allergyMissing' },
} as const;

export const ConsultRoomView = observer(function ConsultRoomView({ viewModel, onNavigate }: { viewModel: ConsultRoomViewModel; onNavigate: (route: RoutePath) => void }): React.ReactElement {
  const t = useT();
  const pickerId = useId();
  const { status, data } = viewModel;
  const tabs: { id: ConsultTab; label: string }[] = [
    { id: 'records', label: t('clinConsult.tab.records') },
    { id: 'notes', label: t('clinConsult.tab.notes') },
    { id: 'prescription', label: t('clinConsult.tab.prescription') },
  ];
  const back = (
    <button type="button" className="co-back" onClick={() => onNavigate('clinician')}>
      <Icon name="arrow-left" size={16} />{t('clinConsult.backToday')}
    </button>
  );

  let body: React.ReactNode;
  if (status === 'loading') {
    body = <div className="co-grid" aria-busy="true" aria-label={t('clinConsult.loading')}><Skeleton height={620} /><Skeleton height={620} /></div>;
  } else if (status === 'error') {
    body = <ClinicianErrorState title={t('clinConsult.errorTitle')} reference={t('clinConsult.reference')} onRetry={() => { void viewModel.load(); }} onHelp={() => onNavigate('support')} />;
  } else if (status === 'unconnected' || status === 'empty' || !data || !data.current) {
    body = <ClinicianEmptyState title={t('clinConsult.emptyTitle')} body={t('clinConsult.emptyBody')} action={{ label: t('clinConsult.openSchedule'), onSelect: () => onNavigate('clinician/schedule') }} />;
  } else if (viewModel.ended) {
    // Shared material leaves the DOM with the call.
    body = <ClinicianEmptyState title={t('clinConsult.endedTitle')} body={t('clinConsult.endedBody')} action={{ label: t('clinShared.backToday'), onSelect: () => onNavigate('clinician') }} />;
  } else {
    const appt = data.current;
    const state = data.state;
    const note = data.note;
    const first = appt.customer.split(' ')[0] || appt.customer;
    const waiting = state?.studentJoined ? t('clinConsult.studentWaiting') : t('clinConsult.studentNotJoined');
    const openNote = () => { handOff({ appointmentId: appt.id }); onNavigate(REVIEW_ROUTES.encounterNote()); };
    const addMedicine = () => { handOff({ patientId: appt.patientId, encounterId: note?.id }); onNavigate(REVIEW_ROUTES.prescribe()); };
    body = (
      <>
        <div className="co-head sk-fade">
          <h1 className="co-title">{t('clinConsult.title', { name: appt.customer })}</h1>
          <p className="co-sub">{t('clinConsult.sub', { when: slotLabel(appt.slotStart), state: waiting })}</p>
          {data.appointments.length > 1 ? (
            <span className="co-picker">
              <label htmlFor={pickerId} className="co-picker__label">{t('clinConsult.switch')}</label>
              <select id={pickerId} className="co-picker__select" value={appt.id} onChange={(e) => { void viewModel.choose(e.target.value); }}>
                {data.appointments.map((a) => <option key={a.id} value={a.id}>{t('clinConsult.option', { name: a.customer, when: slotLabel(a.slotStart) })}</option>)}
              </select>
            </span>
          ) : null}
        </div>
        <OfflineNote online={viewModel.online} loadedAt={viewModel.loadedAt} />

        <div className="co-grid">
          <section className="co-stage" aria-label={t('clinConsult.stageLabel', { name: appt.customer })}>
            {state?.liveMedia ? (
              <ConsultCallPanel
                key={appt.id}
                appointmentId={appt.id}
                party={first}
                beforeJoin={() => viewModel.joinAsProvider()}
                unavailableNote={<p className="co-idle" role="status"><strong>{t('clinConsult.mediaOff')}</strong></p>}
              />
            ) : (
              <div className="co-idle" role="status">
                <strong>{t('clinConsult.mediaOff')}</strong>
                <span>{t('clinConsult.mediaOffBody')}</span>
              </div>
            )}
            <div className="co-controls">
              {/* Screen sharing is not part of the call service yet. */}
              <button type="button" className="co-ctl is-unavailable" aria-disabled="true" title={t('clinConsult.shareUnavailable')}>
                <Icon name="monitor" size={20} /><span className="sk-visually-hidden">{t('clinConsult.shareUnavailable')}</span>
              </button>
              <SkButton variant="on-hero" className="co-end" onClick={viewModel.askEnd}><Icon name="phone-off" size={18} />{t('clinConsult.end')}</SkButton>
            </div>
          </section>

          <section className="co-panel" aria-label={t('clinConsult.details')}>
            <div className="co-panel__tabs"><Tabs label={t('clinConsult.details')} options={tabs} value={viewModel.tab} onChange={viewModel.setTab} controls="co-tabpanel" /></div>
            <div id="co-tabpanel" className="co-panel__body" role="tabpanel">
              {viewModel.tab === 'records' ? (
                <p className="co-note co-note--info"><Icon name="info" size={15} />{t('clinConsult.recordsUnconnected', { name: first })}</p>
              ) : viewModel.tab === 'notes' ? (
                <>
                  {note ? (
                    <dl className="co-soap">
                      {SOAP_KEYS.map((key) => (<div key={key}><dt>{t(SOAP_LABEL[key]).toUpperCase()}</dt><dd>{note[key] || t('clinConsult.notWritten')}</dd></div>))}
                    </dl>
                  ) : <p className="co-idle__note">{t('clinConsult.noNote')}</p>}
                  <SkButton variant="secondary" onClick={openNote}>{t(note ? 'clinConsult.openNote' : 'clinConsult.startNote')}</SkButton>
                </>
              ) : (
                <>
                  {data.prescriptions.length > 0 ? (
                    <ul className="co-meds">
                      {data.prescriptions.flatMap((p) => p.items).map((item) => (
                        <li key={item.id}>
                          <span className="co-record__name">{[item.genericName, item.strength].filter(Boolean).join(' ')}</span>
                          <span className="co-record__meta">{t('clinConsult.sig', { dose: item.dose, frequency: item.frequency, days: item.durationDays })}</span>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="co-idle__note">{t(note ? 'clinConsult.noRx' : 'clinConsult.noRxNoNote')}</p>}
                  {data.prescriptions.length > 0 ? <StatusPill tone="positive"><Icon name="check-2" size={13} />{t('clinConsult.rxIssued')}</StatusPill> : null}
                </>
              )}
            </div>
            <div className="co-panel__actions">
              <SkButton variant="secondary" className="co-action" onClick={addMedicine}><Icon name="plus" size={16} />{t('clinConsult.addMedicine')}</SkButton>
              <SkButton variant="secondary" className="co-action" onClick={() => onNavigate('clinician/lab-orders')}>{t('clinConsult.orderTest')}</SkButton>
              <SkButton variant="secondary" className="co-action" onClick={() => onNavigate('clinician/referrals')}>{t('clinConsult.refer')}</SkButton>
              <SkButton variant="secondary" className="co-action" disabled aria-describedby="co-cert-why">{t('clinConsult.certificate')}</SkButton>
            </div>
            <p id="co-cert-why" className="co-idle__note co-panel__why">{t('clinConsult.certificateUnavailable')}</p>
          </section>
        </div>

        <ConfirmDialog
          open={viewModel.confirmingEnd}
          tone="action"
          title={t('clinConsult.endTitle', { name: first })}
          body={
            <>
              <ul className="co-checks" aria-label={t('clinConsult.beforeYouEnd')}>
                {viewModel.checks.map((c) => (
                  <li key={c.id} className={c.done ? 'is-done' : 'is-missing'}>
                    <Icon name={c.done ? 'check-2' : 'alert-triangle'} size={15} strokeWidth={2.4} />
                    <span>{t(c.done ? CHECK_KEYS[c.id].done : CHECK_KEYS[c.id].missing)}</span>
                  </li>
                ))}
              </ul>
              <p className="co-idle__note">{t('clinConsult.endBody')}</p>
            </>
          }
          confirmLabel={t('clinConsult.endConfirm')}
          cancelLabel={t('clinConsult.stay')}
          onConfirm={viewModel.end}
          onCancel={viewModel.cancelEnd}
        />
      </>
    );
  }
  return <div className="co-page">{back}{body}<Toast message={viewModel.toast} onDone={viewModel.clearToast} /></div>;
});

export function ConsultRoomScreen({ source }: { source?: ConsultSource }): React.ReactElement {
  const t = useT();
  const online = useOnline();
  const [viewModel] = useState(() => new ConsultRoomViewModel(source ?? consultApiSource(), t, takeHandoff()?.appointmentId ?? null));
  useEffect(() => { void viewModel.load(); }, [viewModel]);
  useEffect(() => { viewModel.setOnline(online); }, [viewModel, online]);
  return (
    <ClinicianConsoleFrame current="consult-room" context={t('clinConsult.context')} contextShort={t('clinConsult.contextShort')}>
      <ConsultRoomView viewModel={viewModel} onNavigate={navigate} />
    </ClinicianConsoleFrame>
  );
}
