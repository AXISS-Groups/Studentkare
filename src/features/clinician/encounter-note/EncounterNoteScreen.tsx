import React, { useEffect, useId, useState } from 'react';
import { actionBound, computed, makeObservable, observable, runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';
import { isDev } from '@/core/env';
import { EmptyStateView, ErrorStateView, SkButton, Skeleton, StatusPill, Timeline, Toast } from '@/design-system';
import type { TimelineEntry } from '@/design-system';
import { navigate } from '@/lib/workflowRouting';
import type { RoutePath } from '@/lib/workflowRouting';
import { ClinicianConsoleFrame } from '../shared/ClinicianConsoleFrame';
import { LoadableViewModel } from '../shared/LoadableViewModel';
import type { Loadable } from '../shared/LoadableViewModel';
import { REVIEW_ROUTES } from '../shared/reviewRoutes';
import './encounter-note.css';

/**
 * EncounterNote (design page 5). SOAP note beside one timeline — not four tabs.
 * TIER 1 (clinical record): awaiting a named design reviewer and clinical sign-off.
 */

export const SOAP_KEYS = ['subjective', 'objective', 'assessment', 'plan'] as const;
export type SoapKey = typeof SOAP_KEYS[number];
export type Soap = Record<SoapKey, string>;

export interface EncounterData {
  noteId: string;
  patientName: string;
  /** "Video consult · today, 4:30 PM · 12 minutes" */
  context: string;
  soap: Soap;
  signed: boolean;
  timeline: TimelineEntry[];
}

export interface EncounterSource extends Loadable<EncounterData> {
  save?: (noteId: string, soap: Soap) => Promise<void>;
  /** Signing writes to the student's vault and to the ledger. */
  sign?: (noteId: string, soap: Soap) => Promise<void>;
}

export function encounterSample(): EncounterData {
  return {
    noteId: 'n-sample',
    patientName: 'Priya N.',
    context: 'Video consult · today, 4:30 PM · 12 minutes',
    signed: false,
    soap: {
      subjective: 'Sore throat and fever since last night. No cough or breathlessness. Reports one disturbed night, has been taking fluids. Lives in hostel; two blockmates unwell this week.',
      objective: 'Temp 38.4°C, pulse 96, SpO₂ 98% on room air. Pharynx erythematous, no exudate. Cervical nodes mildly tender. Chest clear on video assessment.',
      assessment: 'Likely viral pharyngitis. No red flags for streptococcal infection on Centor criteria. Low threshold to reassess if fever persists beyond 72 hours.',
      plan: 'Symptomatic management, fluids and rest. Advised to return or escalate if breathing changes, fever persists past 72 hours, or swallowing becomes difficult. Follow-up task set for 3 days.',
    },
    timeline: [
      { id: 't1', title: 'This consult', tag: 'NOW', meta: 'Video · 12 minutes · note in draft', when: 'Today, 4:30 PM', tone: 'live' },
      { id: 't2', title: 'Vitamin D Test released', tag: 'LOW', meta: '11 ng/mL against a 30–100 reference range', when: '20 Sep 2026', tone: 'attention' },
      { id: 't3', title: 'Shared 2 records with you', meta: 'Consent granted for 14 days, expires 04 Oct', when: '21 Sep 2026', tone: 'plain' },
      { id: 't4', title: 'Complete Blood Count', tag: 'NORMAL', meta: 'All 21 parameters within range', when: '04 Aug 2026', tone: 'positive' },
      { id: 't5', title: 'Prescription — Vitamin D3 60K', tag: 'ACTIVE', meta: 'Weekly, 8 weeks · dispensed 03 Aug', when: '02 Aug 2026', tone: 'plain' },
      { id: 't6', title: 'Campus health check-in', meta: 'Annual intake screening, no findings', when: '14 Jul 2026', tone: 'plain' },
      { id: 't7', title: 'Consent window begins', meta: 'Nothing before this date is readable', when: '—', tone: 'edge' },
    ],
  };
}

export const sampleEncounterSource: EncounterSource = { load: async () => encounterSample(), save: async () => undefined, sign: async () => undefined };
const unconnectedEncounterSource: EncounterSource = { load: async () => null };

export class EncounterNoteViewModel extends LoadableViewModel<EncounterData> {
  soap: Soap = { subjective: '', objective: '', assessment: '', plan: '' };
  signed = false;
  saving = false;
  signing = false;
  dirty = false;

  constructor(private readonly source: EncounterSource) {
    super(source);
    makeObservable<EncounterNoteViewModel, 'afterLoad'>(this, {
      soap: observable, signed: observable, saving: observable, signing: observable, dirty: observable,
      missing: computed, canSign: computed, edit: actionBound, afterLoad: actionBound,
    });
  }

  protected isEmpty(): boolean {
    return false;
  }

  protected afterLoad(data: EncounterData): void {
    this.soap = { ...data.soap };
    this.signed = data.signed;
    this.dirty = false;
  }

  /** Sections still empty; signing waits for all four. */
  get missing(): SoapKey[] {
    return SOAP_KEYS.filter((key) => this.soap[key].trim().length === 0);
  }

  get canSign(): boolean {
    return !this.signed && this.missing.length === 0 && !this.signing && !this.saving && typeof this.source.sign === 'function';
  }

  edit(key: SoapKey, text: string): void {
    if (this.signed) return;
    this.soap = { ...this.soap, [key]: text };
    this.dirty = true;
  }

  async saveDraft(): Promise<void> {
    const save = this.source.save;
    const id = this.data?.noteId;
    if (!save || !id || this.signed || this.saving) return;
    this.saving = true;
    try {
      await save(id, this.soap);
      runInAction(() => { this.saving = false; this.dirty = false; this.say('Draft saved. Only you can see it until you sign.'); });
    } catch {
      runInAction(() => { this.saving = false; this.say('Couldn’t save the draft. Your text is still here — try again.'); });
    }
  }

  /** Resolves true once signed; the note is read-only from then on. */
  async sign(): Promise<boolean> {
    const sign = this.source.sign;
    const id = this.data?.noteId;
    if (!sign || !id || !this.canSign) return false;
    this.signing = true;
    try {
      await sign(id, this.soap);
      runInAction(() => { this.signing = false; this.signed = true; this.dirty = false; this.say('Note signed · written to the student’s vault and the ledger'); });
      return true;
    } catch {
      runInAction(() => { this.signing = false; this.say('Couldn’t sign the note. It is still a draft — nothing was written.'); });
      return false;
    }
  }
}

const LABEL: Record<SoapKey, string> = { subjective: 'Subjective', objective: 'Objective', assessment: 'Assessment', plan: 'Plan' };

export const EncounterNoteView = observer(function EncounterNoteView({ viewModel, onNavigate }: { viewModel: EncounterNoteViewModel; onNavigate: (route: RoutePath) => void }): React.ReactElement {
  const { status, data } = viewModel;
  let body: React.ReactNode;
  if (status === 'loading') {
    body = <div className="en-grid" aria-busy="true" aria-label="Loading the encounter note"><div className="en-note"><Skeleton width={260} height={34} />{SOAP_KEYS.map((k) => <Skeleton key={k} height={110} />)}</div><div className="en-side"><Skeleton height={420} /></div></div>;
  } else if (status === 'error') {
    body = <ErrorStateView title="Couldn’t load the note" onRetry={() => { void viewModel.load(); }} onHelp={() => onNavigate('support')} reference="Ref ENCOUNTER · EncounterNote" />;
  } else if (status === 'unconnected' || !data) {
    body = <EmptyStateView title="Encounter notes aren’t connected here yet." body="This new screen is awaiting clinical sign-off. Until then this page shows nothing rather than a guess." action={{ label: 'Back to Today', onClick: () => onNavigate('clinician') }} />;
  } else {
    const prescribe = REVIEW_ROUTES.prescribe();
    body = (
      <div className="en-grid">
        <div className="en-note">
          <div className="en-head sk-fade">
            <div className="en-head__titles">
              <span className="en-eyebrow">ENCOUNTER NOTE · {viewModel.signed ? 'SIGNED' : 'DRAFT'}</span>
              <h1 className="en-title">{data.patientName}</h1>
              <p className="en-context">{data.context}</p>
            </div>
            <StatusPill tone={viewModel.signed ? 'positive' : 'attention'} dot>{viewModel.signed ? 'Signed' : 'Unsigned'}</StatusPill>
          </div>
          {SOAP_KEYS.map((key, index) => <SoapSection key={key} sectionKey={key} index={index} viewModel={viewModel} />)}
          <div className="en-foot">
            {!viewModel.signed ? (
              <>
                <SkButton className="en-sign" busy={viewModel.signing} disabled={!viewModel.canSign} onClick={() => { void viewModel.sign().then((ok) => { if (ok && prescribe) onNavigate(prescribe); }); }} aria-describedby="en-sign-note">
                  Sign &amp; prescribe
                </SkButton>
                <SkButton variant="secondary" busy={viewModel.saving} disabled={viewModel.signing} onClick={() => { void viewModel.saveDraft(); }}>Save draft</SkButton>
              </>
            ) : null}
            <p id="en-sign-note" className="en-foot__note">
              {viewModel.missing.length > 0 && !viewModel.signed
                ? `Fill in ${viewModel.missing.map((k) => LABEL[k].toLowerCase()).join(', ')} to sign.`
                : 'Signing writes to the student’s vault and to the ledger.'}
            </p>
          </div>
        </div>
        <aside className="en-side" aria-labelledby="en-timeline-title">
          <h2 id="en-timeline-title" className="en-eyebrow">ONE TIMELINE, NOT FOUR TABS</h2>
          <Timeline label={`${data.patientName}’s timeline within the consent window`} entries={data.timeline} />
          <p className="en-side__foot">Readings, prescriptions, lab orders and notes on one axis. Anything outside the consent window is absent, not greyed.</p>
        </aside>
      </div>
    );
  }
  return <>{body}<Toast message={viewModel.toast} onDone={viewModel.clearToast} /></>;
});

const SoapSection = observer(function SoapSection({ sectionKey, index, viewModel }: { sectionKey: SoapKey; index: number; viewModel: EncounterNoteViewModel }): React.ReactElement {
  const id = useId();
  return (
    <div className="en-section sk-rise" style={{ '--sk-stagger': index + 1 } as React.CSSProperties}>
      <label className="en-section__label" htmlFor={id}>{LABEL[sectionKey].toUpperCase()}</label>
      <textarea
        id={id}
        className="en-section__text"
        rows={3}
        value={viewModel.soap[sectionKey]}
        readOnly={viewModel.signed}
        onChange={(e) => viewModel.edit(sectionKey, e.target.value)}
      />
    </div>
  );
});

export function EncounterNoteScreen({ source }: { source?: EncounterSource }): React.ReactElement {
  const [viewModel] = useState(() => new EncounterNoteViewModel(source ?? (isDev() ? sampleEncounterSource : unconnectedEncounterSource)));
  useEffect(() => { void viewModel.load(); }, [viewModel]);
  return (
    <ClinicianConsoleFrame current="encounter-note" context="Encounter note" reviewPending>
      <EncounterNoteView viewModel={viewModel} onNavigate={navigate} />
    </ClinicianConsoleFrame>
  );
}
