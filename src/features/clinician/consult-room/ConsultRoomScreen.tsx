import React, { useEffect, useState } from 'react';
import { actionBound, computed, makeObservable, observable, runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';
import { isDev } from '@/core/env';
import { ConfirmDialog } from '@/components/interface/ConfirmDialog';
import { Avatar, DestinationButton, EmptyStateView, ErrorStateView, SkButton, SkIcon, Skeleton, StatusPill, Tabs, Toast } from '@/design-system';
import { navigate } from '@/lib/workflowRouting';
import type { RoutePath } from '@/lib/workflowRouting';
import { ClinicianConsoleFrame } from '../shared/ClinicianConsoleFrame';
import { LoadableViewModel } from '../shared/LoadableViewModel';
import type { Loadable } from '../shared/LoadableViewModel';
import { initialsOf } from '../shared/names';
import { REVIEW_ROUTES } from '../shared/reviewRoutes';
import './consult-room.css';

/**
 * ClinicianConsultRoom (design page 5). TIER 1 (live consult, shared records,
 * prescribing): awaiting a named design reviewer and clinical sign-off.
 *
 * No media is connected here: the stage shows the student's initials, and the
 * mic / camera buttons change only this screen's state.
 */

export interface SharedRecord { id: string; name: string; meta: string }

export interface ConsultData {
  appointmentId: string;
  patientName: string;
  age: number;
  /** "Video consult · started 10:02 · follow-up for fever" */
  summary: string;
  startedAt: Date;
  checkIn?: { time: string; photoMatched: boolean };
  /** Transport facts reported by the call service — never assumed. */
  transport?: { encrypted: boolean; recorded: boolean };
  records: SharedRecord[];
  allergies: string[];
  conditions: string[];
  soap: { subjective: string; objective: string; assessment: string; plan: string };
  medicines: { name: string; sig: string }[];
  prescriptionSigned: boolean;
  allergyChecked: boolean;
  followUpHours: number | null;
}

export interface ConsultSource extends Loadable<ConsultData> {
  end?: (appointmentId: string) => Promise<void>;
  draftCertificate?: (appointmentId: string) => Promise<void>;
}

export function consultSample(): ConsultData {
  return {
    appointmentId: 'sample-rv',
    patientName: 'Rohan Varma',
    age: 19,
    summary: 'Video consult · started 10:02 · follow-up for fever',
    startedAt: new Date(Date.now() - 754 * 1000),
    checkIn: { time: '09:58', photoMatched: true },
    transport: { encrypted: true, recorded: false },
    records: [
      { id: 'r1', name: 'CBC report', meta: 'Released 18 Sep · reviewed' },
      { id: 'r2', name: 'Previous consult note', meta: 'Dr. Reddy · 02 Sep' },
      { id: 'r3', name: 'Vaccination record', meta: 'Hep B complete' },
    ],
    allergies: ['penicillin'],
    conditions: [],
    soap: {
      subjective: 'Fever 3 days, max 101°F, body ache, no cough.',
      objective: 'Looks well on video. Temp self-reported 100.2°F.',
      assessment: 'Likely viral fever. No red flags.',
      plan: 'Paracetamol, fluids, rest. CBC if fever > 5 days. Follow-up chat 72 h.',
    },
    medicines: [
      { name: 'Paracetamol 650 mg', sig: '1 tablet · up to 3×/day after food · 3 days' },
      { name: 'ORS sachet', sig: '1 in 1 L water · sip through the day · 3 days' },
    ],
    prescriptionSigned: true,
    allergyChecked: true,
    followUpHours: 72,
  };
}

export const sampleConsultSource: ConsultSource = { load: async () => consultSample(), end: async () => undefined, draftCertificate: async () => undefined };
const unconnectedConsultSource: ConsultSource = { load: async () => null };

export type ConsultTab = 'records' | 'notes' | 'prescription';

export interface EndCheck { label: string; done: boolean }

export class ConsultRoomViewModel extends LoadableViewModel<ConsultData> {
  tab: ConsultTab = 'records';
  micOn = true;
  cameraOn = true;
  confirmingEnd = false;
  ending = false;
  ended = false;
  now: Date;
  private clock: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly source: ConsultSource, private readonly nowFn: () => Date = () => new Date()) {
    super(source);
    this.now = nowFn();
    makeObservable<ConsultRoomViewModel, 'tick'>(this, {
      tab: observable, micOn: observable, cameraOn: observable, confirmingEnd: observable, ending: observable, ended: observable, now: observable,
      elapsed: computed, checks: computed,
      setTab: actionBound, toggleMic: actionBound, toggleCamera: actionBound, askEnd: actionBound, cancelEnd: actionBound, tick: actionBound,
    });
  }

  protected isEmpty(): boolean { return false; }

  startClock(): () => void {
    this.clock = setInterval(() => this.tick(), 1000);
    return () => { if (this.clock) clearInterval(this.clock); this.clock = null; };
  }

  private tick(): void { this.now = this.nowFn(); }

  /** "12:34" since the consult started. */
  get elapsed(): string {
    const start = this.data?.startedAt;
    if (!start) return '0:00';
    const total = Math.max(0, Math.floor((this.now.getTime() - start.getTime()) / 1000));
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
  }

  /** Computed from the consult, never asserted: an unmet item shows as not done. */
  get checks(): EndCheck[] {
    const d = this.data;
    if (!d) return [];
    const notesComplete = Object.values(d.soap).every((section) => section.trim().length > 0);
    return [
      { label: 'Notes complete', done: notesComplete },
      { label: 'Prescription signed', done: d.medicines.length === 0 || d.prescriptionSigned },
      { label: 'Allergy checked against medicines', done: d.allergyChecked },
      { label: d.followUpHours ? `Follow-up window: ${d.followUpHours} h` : 'Follow-up window set', done: d.followUpHours !== null },
    ];
  }

  setTab(tab: ConsultTab): void { this.tab = tab; }
  toggleMic(): void { this.micOn = !this.micOn; }
  toggleCamera(): void { this.cameraOn = !this.cameraOn; }
  askEnd(): void { this.confirmingEnd = true; }
  cancelEnd(): void { if (!this.ending) this.confirmingEnd = false; }

  async end(): Promise<void> {
    const end = this.source.end;
    const id = this.data?.appointmentId;
    if (!end || !id || this.ending) return;
    this.ending = true;
    try {
      await end(id);
      runInAction(() => { this.ending = false; this.confirmingEnd = false; this.ended = true; this.say('Summary sent · record access closed'); });
    } catch {
      runInAction(() => { this.ending = false; this.say('Couldn’t end the consult cleanly. The call is still open — try again.'); });
    }
  }

  async certificate(): Promise<void> {
    const draft = this.source.draftCertificate;
    const id = this.data?.appointmentId;
    if (!draft || !id) return;
    try {
      await draft(id);
      runInAction(() => this.say('Medical certificate drafted — review and sign it before it is sent'));
    } catch {
      runInAction(() => this.say('Couldn’t draft the certificate. Nothing was created.'));
    }
  }
}

const TABS: { id: ConsultTab; label: string }[] = [
  { id: 'records', label: 'Shared records' },
  { id: 'notes', label: 'Notes (SOAP)' },
  { id: 'prescription', label: 'Prescription' },
];

export const ConsultRoomView = observer(function ConsultRoomView({ viewModel, onNavigate }: { viewModel: ConsultRoomViewModel; onNavigate: (route: RoutePath) => void }): React.ReactElement {
  const { status, data } = viewModel;
  useEffect(() => viewModel.startClock(), [viewModel]);

  let body: React.ReactNode;
  if (status === 'loading') {
    body = <div className="co-grid" aria-busy="true" aria-label="Opening the consult room"><Skeleton height={620} /><Skeleton height={620} /></div>;
  } else if (status === 'error') {
    body = <ErrorStateView title="Couldn’t open the consult room" onRetry={() => { void viewModel.load(); }} onHelp={() => onNavigate('support')} reference="Ref CONSULT · ClinicianConsultRoom" />;
  } else if (status === 'unconnected' || !data) {
    body = <EmptyStateView title="The consult room isn’t connected yet." body="This new screen is awaiting clinical sign-off. Until then this page shows nothing rather than a guess." action={{ label: 'Back to Today', onClick: () => onNavigate('clinician') }} />;
  } else if (viewModel.ended) {
    body = <EmptyStateView title="Consult ended." body={`The summary went to ${data.patientName.split(' ')[0]} and your access to their shared records has closed.`} action={{ label: 'Back to Today', onClick: () => onNavigate('clinician') }} />;
  } else {
    const first = data.patientName.split(' ')[0];
    body = (
      <>
        <div className="co-head sk-fade">
          <h1 className="co-title">Consult · {data.patientName}, {data.age}</h1>
          <p className="co-sub">{data.summary}</p>
          {data.checkIn ? (
            data.checkIn.photoMatched
              ? <StatusPill tone="positive" className="co-verified"><SkIcon name="check" size={13} strokeWidth={2.6} />Verified at check-in · {data.checkIn.time} · photo matched</StatusPill>
              : <StatusPill tone="danger" className="co-verified"><SkIcon name="alert" size={13} strokeWidth={2.4} />Photo did not match at check-in · {data.checkIn.time}</StatusPill>
          ) : <StatusPill tone="neutral" className="co-verified">Not checked in</StatusPill>}
        </div>

        <div className="co-grid">
          <section className="co-stage" aria-label={`Video call with ${data.patientName}`}>
            <div className="co-stage__top">
              <span className="co-live"><span className="co-live__dot" aria-hidden="true" />LIVE</span>
              <span className="co-timer sk-mono" role="timer" aria-label={`Call time ${viewModel.elapsed}`}>{viewModel.elapsed}</span>
              <span className="co-grow" />
              {data.transport ? <span className="co-transport">{data.transport.encrypted ? 'Encrypted' : 'Not encrypted'} · {data.transport.recorded ? 'recorded' : 'not recorded'}</span> : null}
            </div>
            <Avatar initials={initialsOf(data.patientName)} className="co-remote" />
            <span className="co-self" aria-label={viewModel.cameraOn ? 'Your camera is on' : 'Your camera is off'}>{viewModel.cameraOn ? 'You · on camera' : 'Camera off'}</span>
            <div className="co-controls">
              <button type="button" className={`co-ctl${viewModel.micOn ? '' : ' is-off'}`} aria-pressed={!viewModel.micOn} aria-label={viewModel.micOn ? 'Mute microphone' : 'Unmute microphone'} onClick={viewModel.toggleMic}>
                <SkIcon name={viewModel.micOn ? 'mic' : 'micOff'} size={20} />
              </button>
              <button type="button" className={`co-ctl${viewModel.cameraOn ? '' : ' is-danger'}`} aria-pressed={!viewModel.cameraOn} aria-label={viewModel.cameraOn ? 'Turn camera off' : 'Turn camera on'} onClick={viewModel.toggleCamera}>
                <SkIcon name="video" size={20} />
              </button>
              <DestinationButton route={null} onNavigate={onNavigate} className="co-ctl"><SkIcon name="screen" size={20} /><span className="sk-visually-hidden">Share screen</span></DestinationButton>
              <SkButton variant="danger" className="co-end" onClick={viewModel.askEnd}>End</SkButton>
            </div>
          </section>

          <section className="co-panel" aria-label="Consult details">
            <div className="co-panel__tabs"><Tabs label="Consult details" options={TABS} value={viewModel.tab} onChange={viewModel.setTab} controls="co-tabpanel" /></div>
            <div id="co-tabpanel" className="co-panel__body" role="tabpanel">
              {viewModel.tab === 'records' ? (
                <>
                  <p className="co-note"><SkIcon name="info" size={15} />Shared by {first} for this consult only. Access ends when you end the call.</p>
                  <ul className="co-records">
                    {data.records.map((record) => (
                      <li key={record.id} className="co-record">
                        <span className="co-record__icon" aria-hidden="true"><SkIcon name="doc" size={18} /></span>
                        <span className="co-record__text"><span className="co-record__name">{record.name}</span><span className="co-record__meta">{record.meta}</span></span>
                        <DestinationButton route={null} onNavigate={onNavigate} className="sk-link">Open<span className="sk-visually-hidden"> {record.name}</span></DestinationButton>
                      </li>
                    ))}
                  </ul>
                  <div className="co-chips">
                    {data.allergies.map((a) => <StatusPill key={a} tone="danger">Allergy: {a}</StatusPill>)}
                    {data.conditions.length === 0 ? <StatusPill tone="neutral">No long-term conditions recorded</StatusPill> : data.conditions.map((c) => <StatusPill key={c} tone="neutral">{c}</StatusPill>)}
                  </div>
                </>
              ) : viewModel.tab === 'notes' ? (
                <>
                  <dl className="co-soap">
                    {Object.entries(data.soap).map(([key, value]) => (<div key={key}><dt>{key.toUpperCase()}</dt><dd>{value || 'Not written yet'}</dd></div>))}
                  </dl>
                  <DestinationButton route={REVIEW_ROUTES.encounterNote()} onNavigate={onNavigate} className="sk-link">Open the full note</DestinationButton>
                </>
              ) : (
                <>
                  <ul className="co-meds">
                    {data.medicines.map((m) => <li key={m.name}><span className="co-record__name">{m.name}</span><span className="co-record__meta">{m.sig}</span></li>)}
                  </ul>
                  <StatusPill tone={data.prescriptionSigned ? 'positive' : 'attention'}>{data.prescriptionSigned ? 'Signed' : 'Not signed yet'}</StatusPill>
                  <DestinationButton route={REVIEW_ROUTES.prescribe()} onNavigate={onNavigate} className="sk-link">Open the prescription</DestinationButton>
                </>
              )}
            </div>
            <div className="co-panel__actions">
              <DestinationButton route="clinician/lab-orders" onNavigate={onNavigate} className="sk-btn sk-btn--secondary co-action">Order test</DestinationButton>
              <DestinationButton route="clinician/referrals" onNavigate={onNavigate} className="sk-btn sk-btn--secondary co-action">Refer</DestinationButton>
              <SkButton variant="secondary" className="co-action" onClick={() => { void viewModel.certificate(); }}>Certificate</SkButton>
            </div>
          </section>
        </div>

        <ConfirmDialog
          open={viewModel.confirmingEnd}
          tone="destructive"
          title={`End the consult with ${first}?`}
          body={
            <ul className="co-checks" aria-label="Before you end">
              {viewModel.checks.map((c) => (
                <li key={c.label} className={c.done ? 'is-done' : 'is-missing'}>
                  <SkIcon name={c.done ? 'check' : 'alert'} size={15} strokeWidth={2.4} />
                  <span>{c.label}{c.done ? '' : ' — not done'}</span>
                </li>
              ))}
            </ul>
          }
          confirmLabel="End consult"
          cancelLabel="Stay in the call"
          busy={viewModel.ending}
          onConfirm={() => { void viewModel.end(); }}
          onCancel={viewModel.cancelEnd}
        />
      </>
    );
  }
  return <>{body}<Toast message={viewModel.toast} onDone={viewModel.clearToast} /></>;
});

export function ConsultRoomScreen({ source }: { source?: ConsultSource }): React.ReactElement {
  const [viewModel] = useState(() => new ConsultRoomViewModel(source ?? (isDev() ? sampleConsultSource : unconnectedConsultSource)));
  useEffect(() => { void viewModel.load(); }, [viewModel]);
  return (
    <ClinicianConsoleFrame current="consult-room" context="Consult room" contextShort="Consult" reviewPending>
      <ConsultRoomView viewModel={viewModel} onNavigate={navigate} />
    </ClinicianConsoleFrame>
  );
}
