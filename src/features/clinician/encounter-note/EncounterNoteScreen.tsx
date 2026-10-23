import React, { useEffect, useId, useState } from 'react';
import { actionBound, computed, makeObservable, observable, runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';
import { ConfirmDialog, Drawer, SkButton, SkSkeleton as Skeleton, StatusPill, SkToast as Toast, useOnline } from '@/design-system';
import { useT } from '@/i18n';
import { navigate } from '@/lib/utils/workflowRouting';
import type { RoutePath } from '@/lib/utils/workflowRouting';
import { ClinicianConsoleFrame } from '../shared/ClinicianConsoleFrame';
import { ClinicianEmptyState, ClinicianErrorState } from '../shared/ClinicianStates';
import { LoadableViewModel } from '../shared/LoadableViewModel';
import { OfflineNote } from '../shared/OfflineNote';
import { dateOnly, slotLabel } from '../shared/clinicalData';
import type { CareAppointment, T } from '../shared/clinicalData';
import { handOff, takeHandoff } from '../shared/handoff';
import { REVIEW_ROUTES } from '../shared/reviewRoutes';
import { SOAP_KEYS, SOAP_MAX, SignedElsewhere, encounterApiSource } from './encounterModel';
import type { EncounterData, EncounterNoteApi, EncounterSource, Soap, SoapKey } from './encounterModel';
import './encounter-note.css';

export { SOAP_KEYS } from './encounterModel';
export type { Soap, SoapKey } from './encounterModel';

const BLANK: Soap = { subjective: '', objective: '', assessment: '', plan: '' };

/**
 * EncounterNote (design page 5). Tier 1, approved by Krishna Chintakayala on
 * 2026-10-21. One note at a time, beside the timeline. The text lives only in
 * this view model: never in browser storage, never logged.
 */
export class EncounterNoteViewModel extends LoadableViewModel<EncounterData> {
  selectedId: string | null = null;
  soap: Soap = { ...BLANK };
  signed = false;
  saving = false;
  signing = false;
  creating = false;
  dirty = false;
  confirmingSign = false;
  newOpen = false;
  newAppointmentId = '';
  online = true;

  constructor(private readonly source: EncounterSource, private readonly t: T, preferred: { encounterId?: string; appointmentId?: string } | null = null) {
    super(source);
    this.preferred = preferred;
    makeObservable<EncounterNoteViewModel, 'afterLoad'>(this, {
      selectedId: observable, soap: observable, signed: observable, saving: observable, signing: observable, creating: observable,
      dirty: observable, confirmingSign: observable, newOpen: observable, newAppointmentId: observable, online: observable,
      note: computed, missing: computed, canSign: computed, canSave: computed, appointment: computed, patientName: computed,
      edit: actionBound, afterLoad: actionBound, select: actionBound, askSign: actionBound, cancelSign: actionBound,
      openNew: actionBound, closeNew: actionBound, chooseAppointment: actionBound, setOnline: actionBound,
    });
  }

  private preferred: { encounterId?: string; appointmentId?: string } | null;

  /** No note at all is the empty state: nothing to show, one next step. */
  protected isEmpty(data: EncounterData): boolean {
    return data.notes.length === 0;
  }

  protected afterLoad(data: EncounterData): void {
    const want = this.preferred;
    this.preferred = null;
    const byId = want?.encounterId ? data.notes.find((n) => n.id === want.encounterId) : undefined;
    const byAppt = want?.appointmentId ? data.notes.find((n) => n.appointmentId === want.appointmentId) : undefined;
    const keep = this.selectedId ? data.notes.find((n) => n.id === this.selectedId) : undefined;
    const draft = data.notes.find((n) => n.status === 'DRAFT');
    const chosen = byId ?? byAppt ?? keep ?? draft ?? data.notes[0];
    this.applyNote(chosen ?? null);
    // From the consult room: no note for that appointment yet, so offer to start one.
    if (want?.appointmentId && !byId && !byAppt && data.appointments.some((a) => a.id === want.appointmentId)) {
      this.newAppointmentId = want.appointmentId;
      this.newOpen = true;
    }
  }

  private applyNote(note: EncounterNoteApi | null): void {
    this.selectedId = note?.id ?? null;
    this.soap = note ? { subjective: note.subjective, objective: note.objective, assessment: note.assessment, plan: note.plan } : { ...BLANK };
    this.signed = note?.status === 'FINAL';
    this.dirty = false;
  }

  get note(): EncounterNoteApi | null {
    return this.data?.notes.find((n) => n.id === this.selectedId) ?? null;
  }

  get appointment(): CareAppointment | null {
    const note = this.note;
    return note ? this.data?.appointments.find((a) => a.id === note.appointmentId) ?? null : null;
  }

  get patientName(): string {
    const note = this.note;
    if (!note) return '';
    return this.appointment?.customer ?? this.data?.appointments.find((a) => a.patientId === note.patientId)?.customer ?? '';
  }

  /** Sections still empty; signing waits for all four. */
  get missing(): SoapKey[] {
    return SOAP_KEYS.filter((key) => this.soap[key].trim().length === 0);
  }

  get canSave(): boolean {
    return !!this.note && !this.signed && !this.saving && !this.signing && this.online && typeof this.source.save === 'function';
  }

  /** All four sections written, online, not already signed, and a way to sign. Fails closed otherwise. */
  get canSign(): boolean {
    return !!this.note && !this.signed && this.missing.length === 0 && !this.signing && !this.saving && this.online
      && typeof this.source.sign === 'function' && typeof this.source.save === 'function';
  }

  setOnline(online: boolean): void { this.online = online; }

  select(id: string): void {
    if (this.dirty) {
      this.say(this.t('clinNote.toast.unsavedSwitch'));
      return;
    }
    this.applyNote(this.data?.notes.find((n) => n.id === id) ?? null);
  }

  edit(key: SoapKey, text: string): void {
    if (this.signed || !this.note) return;
    this.soap = { ...this.soap, [key]: text.slice(0, SOAP_MAX) };
    this.dirty = true;
  }

  openNew(): void { this.newOpen = true; }
  closeNew(): void { if (!this.creating) this.newOpen = false; }
  chooseAppointment(id: string): void { this.newAppointmentId = id; }

  async create(): Promise<void> {
    const create = this.source.create;
    const appointmentId = this.newAppointmentId;
    if (!create || !appointmentId || this.creating || !this.online) return;
    this.creating = true;
    try {
      const id = await create(appointmentId);
      runInAction(() => { this.creating = false; this.newOpen = false; this.newAppointmentId = ''; this.selectedId = id; this.dirty = false; });
      await this.load();
      runInAction(() => this.say(this.t('clinNote.toast.created')));
    } catch {
      runInAction(() => { this.creating = false; this.say(this.t('clinNote.toast.createFailed')); });
    }
  }

  async saveDraft(): Promise<void> {
    const save = this.source.save;
    const id = this.note?.id;
    if (!save || !id || !this.canSave) return;
    this.saving = true;
    try {
      await save(id, this.soap);
      runInAction(() => {
        this.saving = false;
        this.dirty = false;
        this.patchNote(id, { ...this.soap });
        this.say(this.t('clinNote.toast.saved'));
      });
    } catch (reason) {
      runInAction(() => { this.saving = false; this.say(this.t(reason instanceof SignedElsewhere ? 'clinNote.toast.signedElsewhere' : 'clinNote.toast.saveFailed')); });
    }
  }

  askSign(): void { if (this.canSign) this.confirmingSign = true; }
  cancelSign(): void { if (!this.signing) this.confirmingSign = false; }

  private patchNote(id: string, fields: Partial<EncounterNoteApi>): void {
    if (!this.data) return;
    this.data = { ...this.data, notes: this.data.notes.map((n) => (n.id === id ? { ...n, ...fields } : n)) };
  }

  /**
   * Saves what is on screen, then signs. Resolves true only when this sign
   * went through; a failed save never signs, and a note already signed
   * elsewhere is shown as signed with what the server holds.
   */
  async sign(): Promise<boolean> {
    const save = this.source.save;
    const sign = this.source.sign;
    const id = this.note?.id;
    if (!save || !sign || !id || !this.canSign) return false;
    this.signing = true;
    try {
      if (this.dirty) await save(id, this.soap);
      const outcome = await sign(id);
      runInAction(() => {
        this.signing = false;
        this.confirmingSign = false;
        this.dirty = false;
        if (outcome === 'signed') {
          this.signed = true;
          this.patchNote(id, { ...this.soap, status: 'FINAL' });
          this.say(this.t('clinNote.toast.signed'));
        } else {
          this.say(this.t('clinNote.toast.alreadySigned'));
        }
      });
      if (outcome === 'already-signed') await this.load();
      return outcome === 'signed';
    } catch (reason) {
      runInAction(() => { this.signing = false; this.confirmingSign = false; this.say(this.t(reason instanceof SignedElsewhere ? 'clinNote.toast.signedElsewhere' : 'clinNote.toast.signFailed')); });
      if (reason instanceof SignedElsewhere) await this.load();
      return false;
    }
  }
}

const LABEL: Record<SoapKey, 'clinNote.subjective' | 'clinNote.objective' | 'clinNote.assessment' | 'clinNote.plan'> = {
  subjective: 'clinNote.subjective', objective: 'clinNote.objective', assessment: 'clinNote.assessment', plan: 'clinNote.plan',
};

export const EncounterNoteView = observer(function EncounterNoteView({ viewModel, onNavigate }: { viewModel: EncounterNoteViewModel; onNavigate: (route: RoutePath) => void }): React.ReactElement {
  const t = useT();
  const pickerId = useId();
  const { status, data } = viewModel;
  let body: React.ReactNode;
  if (status === 'loading') {
    body = <div className="en-grid" aria-busy="true" aria-label={t('clinNote.loading')}><div className="en-note"><Skeleton width={260} height={34} />{SOAP_KEYS.map((k) => <Skeleton key={k} height={110} />)}</div><div className="en-side"><Skeleton height={420} /></div></div>;
  } else if (status === 'error') {
    body = <ClinicianErrorState title={t('clinNote.errorTitle')} reference={t('clinNote.reference')} onRetry={() => { void viewModel.load(); }} onHelp={() => onNavigate('support')} />;
  } else if (status === 'unconnected' || status === 'empty' || !data || !viewModel.note) {
    body = <ClinicianEmptyState title={t('clinNote.emptyTitle')} body={t('clinNote.emptyBody')} action={viewModel.online ? { label: t('clinNote.new'), onSelect: viewModel.openNew } : undefined} />;
  } else {
    const note = viewModel.note;
    const appt = viewModel.appointment;
    const name = viewModel.patientName || t('clinNote.nameUnknown');
    const context = appt ? t('clinNote.context', { when: slotLabel(appt.slotStart) }) : t('clinNote.contextCreated', { date: dateOnly(note.createdAt) });
    body = (
      <div className="en-grid">
        <div className="en-note">
          <div className="en-head sk-fade">
            <div className="en-head__titles">
              <span className="en-eyebrow">{t(viewModel.signed ? 'clinNote.eyebrowSigned' : 'clinNote.eyebrowDraft')}</span>
              <h1 className="en-title">{name}</h1>
              <p className="en-context">{context}</p>
            </div>
            <StatusPill tone={viewModel.signed ? 'positive' : 'attention'} dot>{t(viewModel.signed ? 'clinNote.signed' : 'clinNote.unsigned')}</StatusPill>
          </div>
          <OfflineNote online={viewModel.online} loadedAt={viewModel.loadedAt} />
          <div className="en-picker">
            <label htmlFor={pickerId} className="en-picker__label">{t('clinNote.yourNotes')}</label>
            <select id={pickerId} className="en-picker__select" value={note.id} onChange={(e) => viewModel.select(e.target.value)}>
              {data.notes.map((n) => {
                const who = data.appointments.find((a) => a.patientId === n.patientId)?.customer ?? t('clinNote.nameUnknown');
                return <option key={n.id} value={n.id}>{t(n.status === 'FINAL' ? 'clinNote.optionSigned' : 'clinNote.optionDraft', { name: who, date: dateOnly(n.createdAt) })}</option>;
              })}
            </select>
            <SkButton variant="secondary" onClick={viewModel.openNew} disabled={!viewModel.online}>{t('clinNote.new')}</SkButton>
          </div>
          {SOAP_KEYS.map((key, index) => <SoapSection key={key} sectionKey={key} index={index} viewModel={viewModel} />)}
          <div className="en-foot">
            {!viewModel.signed ? (
              <>
                <SkButton className="en-sign" busy={viewModel.signing} disabled={!viewModel.canSign} onClick={viewModel.askSign} aria-describedby="en-sign-note">
                  {t('clinNote.signPrescribe')}
                </SkButton>
                <SkButton variant="secondary" busy={viewModel.saving} disabled={!viewModel.canSave || !viewModel.dirty} onClick={() => { void viewModel.saveDraft(); }}>{t('clinNote.saveDraft')}</SkButton>
              </>
            ) : null}
            <p id="en-sign-note" className="en-foot__note">
              {viewModel.signed
                ? t('clinNote.signedNote')
                : viewModel.missing.length > 0
                  ? t('clinNote.fillIn', { sections: viewModel.missing.map((k) => t(LABEL[k]).toLowerCase()).join(', ') })
                  : t('clinNote.signingWrites')}
            </p>
          </div>
        </div>
        <aside className="en-side" aria-labelledby="en-timeline-title">
          <h2 id="en-timeline-title" className="en-eyebrow">{t('clinNote.timelineTitle')}</h2>
          {/* No clinician-side, consent-filtered timeline endpoint exists yet: the
              panel says so instead of assembling one in the browser. */}
          <p className="en-side__empty" role="status">{t('clinNote.timelineUnconnected')}</p>
          <p className="en-side__foot">{t('clinNote.timelineFoot')}</p>
        </aside>
      </div>
    );
  }
  return (
    <>
      {body}
      <SignDialog viewModel={viewModel} onNavigate={onNavigate} />
      <NewNoteDrawer viewModel={viewModel} />
      <Toast message={viewModel.toast} onDone={viewModel.clearToast} />
    </>
  );
});

const SoapSection = observer(function SoapSection({ sectionKey, index, viewModel }: { sectionKey: SoapKey; index: number; viewModel: EncounterNoteViewModel }): React.ReactElement {
  const t = useT();
  const id = useId();
  return (
    <div className="en-section sk-rise" style={{ '--sk-stagger': index + 1 } as React.CSSProperties}>
      <label className="en-section__label" htmlFor={id}>{t(LABEL[sectionKey]).toUpperCase()}</label>
      <textarea
        id={id}
        className="en-section__text"
        rows={3}
        maxLength={SOAP_MAX}
        value={viewModel.soap[sectionKey]}
        readOnly={viewModel.signed || !viewModel.online}
        onChange={(e) => viewModel.edit(sectionKey, e.target.value)}
      />
    </div>
  );
});

const SignDialog = observer(function SignDialog({ viewModel, onNavigate }: { viewModel: EncounterNoteViewModel; onNavigate: (route: RoutePath) => void }): React.ReactElement {
  const t = useT();
  const note = viewModel.note;
  return (
    <ConfirmDialog
      open={viewModel.confirmingSign}
      title={t('clinNote.signTitle')}
      body={t('clinNote.signBody')}
      confirmLabel={t('clinNote.signPrescribe')}
      cancelLabel={t('clinNote.keepEditing')}
      busy={viewModel.signing}
      onCancel={viewModel.cancelSign}
      onConfirm={() => {
        void viewModel.sign().then((ok) => {
          if (ok && note) {
            handOff({ patientId: note.patientId, encounterId: note.id });
            onNavigate(REVIEW_ROUTES.prescribe());
          }
        });
      }}
    />
  );
});

const NewNoteDrawer = observer(function NewNoteDrawer({ viewModel }: { viewModel: EncounterNoteViewModel }): React.ReactElement | null {
  const t = useT();
  const selectId = useId();
  if (!viewModel.newOpen) return null;
  const appointments = viewModel.data?.appointments ?? [];
  return (
    <Drawer open title={t('clinNote.new')} busy={viewModel.creating} onClose={viewModel.closeNew}>
      <p className="en-drawer__intro">{t('clinNote.newIntro')}</p>
      {appointments.length === 0 ? (
        <p className="en-drawer__none" role="status">{t('clinNote.noAppointments')}</p>
      ) : (
        <>
          <label htmlFor={selectId} className="en-picker__label">{t('clinNote.appointment')}</label>
          <select id={selectId} className="en-picker__select" value={viewModel.newAppointmentId} onChange={(e) => viewModel.chooseAppointment(e.target.value)} data-autofocus>
            <option value="">{t('clinNote.chooseAppointment')}</option>
            {appointments.map((a) => <option key={a.id} value={a.id}>{t(a.status === 'COMPLETED' ? 'clinNote.apptCompleted' : 'clinNote.apptConfirmed', { name: a.customer, when: slotLabel(a.slotStart) })}</option>)}
          </select>
        </>
      )}
      <SkButton busy={viewModel.creating} disabled={!viewModel.newAppointmentId || !viewModel.online} onClick={() => { void viewModel.create(); }}>{t('clinNote.start')}</SkButton>
    </Drawer>
  );
});

export function EncounterNoteScreen({ source }: { source?: EncounterSource }): React.ReactElement {
  const t = useT();
  const online = useOnline();
  const [viewModel] = useState(() => new EncounterNoteViewModel(source ?? encounterApiSource(), t, takeHandoff()));
  useEffect(() => { void viewModel.load(); }, [viewModel]);
  useEffect(() => { viewModel.setOnline(online); }, [viewModel, online]);
  return (
    <ClinicianConsoleFrame current="encounter-note" context={t('clinNote.title')}>
      <EncounterNoteView viewModel={viewModel} onNavigate={navigate} />
    </ClinicianConsoleFrame>
  );
}
