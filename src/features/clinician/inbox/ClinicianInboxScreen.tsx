import React, { useEffect, useId, useState } from 'react';
import { actionBound, computed, makeObservable, observable, runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';
import { isDev } from '@/core/env';
import { EmptyStateView, ErrorStateView, SkButton, Skeleton, StatusPill, Tabs, Toast } from '@/design-system';
import type { SkTone } from '@/design-system';
import { navigate } from '@/lib/workflowRouting';
import type { RoutePath } from '@/lib/workflowRouting';
import { ClinicianConsoleFrame } from '../shared/ClinicianConsoleFrame';
import { LoadableViewModel } from '../shared/LoadableViewModel';
import type { Loadable } from '../shared/LoadableViewModel';
import './inbox.css';

/**
 * ClinicianInbox (design page 5). One place for everything that needs the
 * doctor's decision; critical results always sit on top.
 * TIER 1 (shows clinical values, escalation actions): awaiting a named design
 * reviewer and clinical sign-off.
 */

export type InboxKind = 'critical' | 'result' | 'message' | 'renewal' | 'referral';

export interface InboxValue {
  name: string;
  value: string;
  /** critical → red; out-of-range → amber; normal → plain. */
  flag: 'critical' | 'out-of-range' | 'normal';
}

export interface InboxItem {
  id: string;
  kind: InboxKind;
  who: string;
  /** One line in the list. */
  line: string;
  ageMinutes: number;
  /** "15 min", "72-h window", "Today", "FYI" */
  window: string;
  body: string;
  values?: InboxValue[];
}

interface ActionSpec {
  label: string;
  variant: 'danger' | 'primary' | 'secondary';
  done: string;
  /** The note / reply box must say something first. */
  needsText?: boolean;
}

export const KIND: Record<InboxKind, { tag: string; tone: SkTone; title: string; placeholder: (who: string) => string; actions: ActionSpec[] }> = {
  critical: { tag: 'CRIT', tone: 'danger', title: 'Critical result', placeholder: () => 'Clinician note (added to the record)',
    actions: [{ label: 'Call patient now', variant: 'danger', done: 'Calling — the attempt is logged' }, { label: 'Send to emergency', variant: 'secondary', done: 'Emergency referral sent' }] },
  result: { tag: 'LAB', tone: 'attention', title: 'Result to sign', placeholder: () => 'Clinician summary (the student reads this with the result)',
    actions: [{ label: 'Sign and release', variant: 'primary', done: 'Report released with your summary', needsText: true }, { label: 'Order retest', variant: 'secondary', done: 'Retest ordered' }] },
  message: { tag: 'MSG', tone: 'action', title: 'Follow-up message', placeholder: (who) => `Reply to ${who} (they see this in the app)`,
    actions: [{ label: 'Send reply', variant: 'primary', done: 'Reply sent', needsText: true }, { label: 'Book a consult', variant: 'secondary', done: 'Consult offered' }] },
  renewal: { tag: 'REFILL', tone: 'neutral', title: 'Renewal request', placeholder: () => 'Clinician note (added to the record)',
    actions: [{ label: 'Approve refill', variant: 'primary', done: 'Refill approved · sent to pharmacy' }, { label: 'Needs a consult', variant: 'secondary', done: 'Asked to book' }] },
  referral: { tag: 'REF', tone: 'positive', title: 'Referral reply', placeholder: () => 'Clinician note (added to the record)',
    actions: [{ label: 'Mark read', variant: 'secondary', done: 'Marked read' }] },
};

export interface InboxSource extends Loadable<InboxItem[]> {
  act?: (id: string, action: string, text: string) => Promise<void>;
}

export function inboxSample(): InboxItem[] {
  return [
    { id: 'i1', kind: 'critical', who: 'Arjun Nair, 20', line: 'Potassium 6.8 mmol/L · lab flagged critical', ageMinutes: 8, window: '15 min', body: 'The lab has flagged a critical potassium. Call the patient now and decide whether to send them to emergency. This cannot wait for the queue.', values: [{ name: 'K+', value: '6.8', flag: 'critical' }, { name: 'Na+', value: '138', flag: 'normal' }, { name: 'Creatinine', value: '0.9', flag: 'normal' }] },
    { id: 'i2', kind: 'message', who: 'Kavya Iyer, 19', line: '“The cream is making my skin peel, should I stop?”', ageMinutes: 22, window: '72-h window', body: '“The cream is making my skin peel a lot on day 3, should I stop using it?” — within the follow-up window after your 09:30 consult.' },
    { id: 'i3', kind: 'result', who: 'Sneha Patel, 21', line: 'Lipid profile ready to sign · 2 values out of range', ageMinutes: 45, window: 'Today', body: 'Lipid profile: HDL low, triglycerides high. Add a clinician summary before it is released to Sneha.', values: [{ name: 'HDL', value: '36', flag: 'out-of-range' }, { name: 'TG', value: '182', flag: 'out-of-range' }, { name: 'LDL', value: '98', flag: 'normal' }] },
    { id: 'i4', kind: 'renewal', who: 'Diya Reddy, 20', line: 'Salbutamol inhaler refill · last Rx 30 days ago', ageMinutes: 120, window: 'Today', body: 'Refill request for salbutamol inhaler 100 mcg. Last prescribed 24 Aug. No new symptoms reported.' },
    { id: 'i5', kind: 'message', who: 'Rohan Varma, 19', line: '“Fever is down today, thank you”', ageMinutes: 200, window: '72-h window', body: '“Fever is down today, thank you doctor.”' },
    { id: 'i6', kind: 'referral', who: 'Dermatology · Dr. Rao', line: 'Accepted your referral for Meera Iyer', ageMinutes: 300, window: 'FYI', body: 'Dr. Rao (Dermatology, KIMS) accepted the referral. First slot 29 Sep, 11:00.' },
  ];
}

export const sampleInboxSource: InboxSource = { load: async () => inboxSample(), act: async () => undefined };
const unconnectedInboxSource: InboxSource = { load: async () => null };

export type InboxFilter = 'all' | InboxKind;

export function ageText(minutes: number): string {
  return minutes < 60 ? `${minutes} min` : `${Math.round(minutes / 60)} h`;
}

export class InboxViewModel extends LoadableViewModel<InboxItem[]> {
  filter: InboxFilter = 'all';
  selectedId: string | null = null;
  text = '';
  busy = false;

  constructor(private readonly source: InboxSource) {
    super(source);
    makeObservable(this, {
      filter: observable, selectedId: observable, text: observable, busy: observable,
      shown: computed, selected: computed,
      setFilter: actionBound, select: actionBound, setText: actionBound,
    });
  }

  protected isEmpty(items: InboxItem[]): boolean {
    return items.length === 0;
  }

  /** Critical first, then by age — never by arrival alone. */
  get shown(): InboxItem[] {
    const items = (this.data ?? []).filter((item) => this.filter === 'all' || item.kind === this.filter);
    return [...items].sort((a, b) => Number(b.kind === 'critical') - Number(a.kind === 'critical') || a.ageMinutes - b.ageMinutes);
  }

  get selected(): InboxItem | null {
    return this.shown.find((item) => item.id === this.selectedId) ?? this.shown[0] ?? null;
  }

  count(filter: InboxFilter): number {
    return (this.data ?? []).filter((item) => filter === 'all' || item.kind === filter).length;
  }

  setFilter(filter: InboxFilter): void {
    this.filter = filter;
    this.selectedId = null;
    this.text = '';
  }

  select(id: string): void {
    this.selectedId = id;
    this.text = '';
  }

  setText(text: string): void {
    this.text = text;
  }

  canDo(spec: ActionSpec): boolean {
    return !this.busy && typeof this.source.act === 'function' && (!spec.needsText || this.text.trim().length > 0);
  }

  async act(spec: ActionSpec): Promise<void> {
    const item = this.selected;
    const act = this.source.act;
    if (!item || !act || !this.canDo(spec)) return;
    this.busy = true;
    try {
      await act(item.id, spec.label, this.text.trim());
      runInAction(() => {
        this.data = (this.data ?? []).filter((i) => i.id !== item.id);
        this.selectedId = null;
        this.text = '';
        this.busy = false;
        this.say(spec.done);
      });
    } catch {
      runInAction(() => {
        this.busy = false;
        this.say('That didn’t go through. Nothing changed — try again.');
      });
    }
  }
}

const FILTERS: { id: InboxFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'critical', label: 'Critical' },
  { id: 'result', label: 'Results' },
  { id: 'message', label: 'Messages' },
  { id: 'renewal', label: 'Renewals' },
  { id: 'referral', label: 'Referrals' },
];

export const InboxView = observer(function InboxView({ viewModel, onNavigate }: { viewModel: InboxViewModel; onNavigate: (route: RoutePath) => void }): React.ReactElement {
  const { status, data } = viewModel;
  let body: React.ReactNode;
  if (status === 'loading') {
    body = <div className="ib-skeleton" aria-busy="true" aria-label="Loading your inbox"><Skeleton width={200} height={30} /><div className="ib-grid"><Skeleton height={420} /><Skeleton height={420} /></div></div>;
  } else if (status === 'error') {
    body = <ErrorStateView title="Couldn’t load your inbox" onRetry={() => { void viewModel.load(); }} onHelp={() => onNavigate('support')} reference="Ref INBOX · ClinicianInbox" />;
  } else if (status === 'unconnected') {
    body = <EmptyStateView title="Your inbox isn’t connected yet." body="This new screen is awaiting clinical sign-off. Until then this page shows nothing rather than a guess." action={{ label: 'Back to Today', onClick: () => onNavigate('clinician') }} />;
  } else if (status === 'empty' || !data) {
    body = <EmptyStateView title="Nothing needs your decision." body="Critical results, results to sign, messages and refill requests arrive here, most urgent first." action={{ label: 'Back to Today', onClick: () => onNavigate('clinician') }} />;
  } else {
    body = (
      <>
        <div className="ib-head sk-fade">
          <h1 className="ib-title">Inbox</h1>
          <p className="ib-subtitle">One place for everything that needs your decision. Critical results always sit on top.</p>
        </div>
        <div className="ib-grid">
          <section className="ib-list-card" aria-label="Inbox items">
            <div className="ib-filters">
              <Tabs label="Filter the inbox" variant="chip" options={FILTERS.map((f) => ({ ...f, count: viewModel.count(f.id) }))} value={viewModel.filter} onChange={viewModel.setFilter} controls="ib-list" />
            </div>
            <ul id="ib-list" className="ib-list">
              {viewModel.shown.map((item) => {
                const kind = KIND[item.kind];
                const on = viewModel.selected?.id === item.id;
                return (
                  <li key={item.id}>
                    <button type="button" className={`ib-item${on ? ' is-on' : ''}`} aria-current={on ? 'true' : undefined} aria-controls="ib-detail" onClick={() => viewModel.select(item.id)}>
                      <span className={`ib-tag sk-tone--${kind.tone}`} aria-hidden="true">{kind.tag}</span>
                      <span className="ib-item__text">
                        <span className="ib-item__who"><span className="sk-visually-hidden">{kind.title}: </span>{item.who}</span>
                        <span className="ib-item__line">{item.line}</span>
                      </span>
                      <span className={`ib-item__age sk-mono${item.kind === 'critical' ? ' is-critical' : ''}`}>{ageText(item.ageMinutes)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {viewModel.shown.length === 0 ? <p className="ib-none" role="status">Nothing here under this filter.</p> : null}
          </section>
          <Detail viewModel={viewModel} />
        </div>
      </>
    );
  }
  return <>{body}<Toast message={viewModel.toast} onDone={viewModel.clearToast} /></>;
});

const Detail = observer(function Detail({ viewModel }: { viewModel: InboxViewModel }): React.ReactElement {
  const noteId = useId();
  const item = viewModel.selected;
  if (!item) return <section id="ib-detail" className="ib-detail" aria-label="Selected item"><p className="ib-none">Choose an item to see it here.</p></section>;
  const kind = KIND[item.kind];
  const first = item.who.split(',')[0];
  return (
    <section id="ib-detail" className="ib-detail" aria-labelledby="ib-detail-title" aria-live="polite">
      <div className="ib-detail__head">
        <span className={`ib-tag ib-tag--lg sk-tone--${kind.tone}`} aria-hidden="true">{kind.tag}</span>
        <span className="ib-detail__titles">
          <h2 id="ib-detail-title" className="ib-detail__title">{kind.title}</h2>
          <span className="ib-detail__who">{item.who} · {ageText(item.ageMinutes)} ago</span>
        </span>
        <StatusPill tone={item.kind === 'critical' ? 'danger' : 'neutral'}>{item.window}</StatusPill>
      </div>
      <p className="ib-body">{item.body}</p>
      {item.values ? (
        <dl className="ib-values">
          {item.values.map((v) => (
            <div key={v.name} className="ib-value">
              <dt>{v.name}</dt>
              <dd className={`sk-mono ib-value__v ib-value__v--${v.flag}`}>
                {v.value}
                {v.flag !== 'normal' ? <span className="sk-visually-hidden"> ({v.flag === 'critical' ? 'critical' : 'outside the lab’s range'})</span> : null}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      <label className="sk-visually-hidden" htmlFor={noteId}>{kind.placeholder(first)}</label>
      <textarea id={noteId} className="ib-note" rows={5} value={viewModel.text} placeholder={kind.placeholder(first)} onChange={(e) => viewModel.setText(e.target.value)} />
      <div className="ib-actions">
        {kind.actions.map((spec) => (
          <SkButton key={spec.label} variant={spec.variant} busy={viewModel.busy} disabled={!viewModel.canDo(spec)} onClick={() => { void viewModel.act(spec); }}>
            {spec.label}
          </SkButton>
        ))}
      </div>
    </section>
  );
});

export function ClinicianInboxScreen({ source }: { source?: InboxSource }): React.ReactElement {
  const [viewModel] = useState(() => new InboxViewModel(source ?? (isDev() ? sampleInboxSource : unconnectedInboxSource)));
  useEffect(() => { void viewModel.load(); }, [viewModel]);
  return (
    <ClinicianConsoleFrame current="inbox" context="Inbox" reviewPending>
      <InboxView viewModel={viewModel} onNavigate={navigate} />
    </ClinicianConsoleFrame>
  );
}
