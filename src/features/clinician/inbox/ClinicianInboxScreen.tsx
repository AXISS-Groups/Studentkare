import React, { useEffect, useId, useState } from 'react';
import { actionBound, computed, makeObservable, observable, runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';
import { SkButton, SkSkeleton as Skeleton, StatusPill, Tabs, SkToast as Toast } from '@/design-system';
import type { SkTone } from '@/design-system';
import { Icon } from '@/design-system/icons';
import { useT } from '@/i18n';
import type { MessageKey, Vars } from '@/i18n';
import { navigate } from '@/lib/utils/workflowRouting';
import type { RoutePath } from '@/lib/utils/workflowRouting';
import { ClinicianConsoleFrame } from '../shared/ClinicianConsoleFrame';
import { ClinicianEmptyState, ClinicianErrorState } from '../shared/ClinicianStates';
import { LoadableViewModel } from '../shared/LoadableViewModel';
import type { Loadable } from '../shared/LoadableViewModel';
import './inbox.css';

/**
 * ClinicianInbox (design page 5). One place for everything that needs the
 * doctor's decision; critical results always sit on top.
 *
 * No endpoint gathers these items for a doctor yet, so production shows the
 * layout and says it is not connected — no sample items, in any build. The
 * item detail shows lab values and escalation actions: connecting a source is
 * a Tier 1 change (named design reviewer and clinical sign-off, DESIGN.md §5).
 */

export type InboxKind = 'critical' | 'result' | 'message' | 'renewal' | 'referral';

interface InboxValue {
  name: string;
  value: string;
  /** critical: red; out-of-range: amber; normal: plain. */
  flag: 'critical' | 'out-of-range' | 'normal';
}

export interface InboxItem {
  id: string;
  kind: InboxKind;
  who: string;
  /** One line in the list. */
  line: string;
  ageMinutes: number;
  /** "15 min", "72-h window", "Today", "FYI" — from the source. */
  window: string;
  body: string;
  values?: InboxValue[];
}

export interface ActionSpec {
  id: string;
  label: MessageKey;
  variant: 'danger' | 'primary' | 'secondary';
  done: MessageKey;
  /** The note / reply box must say something first. */
  needsText?: boolean;
}

export const KIND: Record<InboxKind, { tag: MessageKey; tone: SkTone; title: MessageKey; placeholder: MessageKey; actions: ActionSpec[] }> = {
  critical: { tag: 'clinInbox.tag.critical', tone: 'danger', title: 'clinInbox.kind.critical', placeholder: 'clinInbox.ph.note',
    actions: [{ id: 'call', label: 'clinInbox.act.call', variant: 'danger', done: 'clinInbox.done.call' }, { id: 'emergency', label: 'clinInbox.act.emergency', variant: 'secondary', done: 'clinInbox.done.emergency' }] },
  result: { tag: 'clinInbox.tag.result', tone: 'attention', title: 'clinInbox.kind.result', placeholder: 'clinInbox.ph.summary',
    actions: [{ id: 'release', label: 'clinInbox.act.release', variant: 'primary', done: 'clinInbox.done.release', needsText: true }, { id: 'retest', label: 'clinInbox.act.retest', variant: 'secondary', done: 'clinInbox.done.retest' }] },
  message: { tag: 'clinInbox.tag.message', tone: 'action', title: 'clinInbox.kind.message', placeholder: 'clinInbox.ph.reply',
    actions: [{ id: 'reply', label: 'clinInbox.act.reply', variant: 'primary', done: 'clinInbox.done.reply', needsText: true }, { id: 'book', label: 'clinInbox.act.book', variant: 'secondary', done: 'clinInbox.done.book' }] },
  renewal: { tag: 'clinInbox.tag.renewal', tone: 'neutral', title: 'clinInbox.kind.renewal', placeholder: 'clinInbox.ph.note',
    actions: [{ id: 'approve', label: 'clinInbox.act.approve', variant: 'primary', done: 'clinInbox.done.approve' }, { id: 'consult', label: 'clinInbox.act.consult', variant: 'secondary', done: 'clinInbox.done.consult' }] },
  referral: { tag: 'clinInbox.tag.referral', tone: 'positive', title: 'clinInbox.kind.referral', placeholder: 'clinInbox.ph.note',
    actions: [{ id: 'read', label: 'clinInbox.act.read', variant: 'secondary', done: 'clinInbox.done.read' }] },
};

export interface InboxSource extends Loadable<InboxItem[]> {
  /** Absent when the source can't act; the buttons then stay disabled. */
  act?: (id: string, action: string, text: string) => Promise<void>;
}

/** No endpoint yet: production and development alike. */
export const unconnectedInboxSource: InboxSource = { load: async () => null };

export type InboxFilter = 'all' | InboxKind;

/** "8 min" / "2 h" as a key and its value. */
function ageText(minutes: number): { key: MessageKey; vars: Vars } {
  return minutes < 60 ? { key: 'clinInbox.ageMin', vars: { n: minutes } } : { key: 'clinInbox.ageHours', vars: { n: Math.round(minutes / 60) } };
}

export class InboxViewModel extends LoadableViewModel<InboxItem[]> {
  filter: InboxFilter = 'all';
  selectedId: string | null = null;
  text = '';
  busy = false;
  /** The last action's outcome, translated by the view. */
  outcome: { key: MessageKey; ok: boolean } | null = null;

  constructor(private readonly source: InboxSource) {
    super(source);
    makeObservable(this, {
      filter: observable, selectedId: observable, text: observable, busy: observable, outcome: observable,
      shown: computed, selected: computed,
      setFilter: actionBound, select: actionBound, setText: actionBound, clearOutcome: actionBound,
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
      await act(item.id, spec.id, this.text.trim());
      runInAction(() => {
        this.data = (this.data ?? []).filter((i) => i.id !== item.id);
        this.selectedId = null;
        this.text = '';
        this.busy = false;
        this.outcome = { key: spec.done, ok: true };
      });
    } catch {
      runInAction(() => {
        this.busy = false;
        this.outcome = { key: 'clinInbox.failed', ok: false };
      });
    }
  }

  clearOutcome(): void {
    this.outcome = null;
  }
}

const FILTERS: { id: InboxFilter; label: MessageKey }[] = [
  { id: 'all', label: 'clinInbox.filter.all' },
  { id: 'critical', label: 'clinInbox.filter.critical' },
  { id: 'result', label: 'clinInbox.filter.results' },
  { id: 'message', label: 'clinInbox.filter.messages' },
  { id: 'renewal', label: 'clinInbox.filter.renewals' },
  { id: 'referral', label: 'clinInbox.filter.referrals' },
];

function Head(): React.ReactElement {
  const t = useT();
  return (
    <div className="ib-head sk-fade">
      <h1 className="ib-title">{t('clinInbox.title')}</h1>
      <p className="ib-subtitle">{t('clinInbox.subtitle')}</p>
    </div>
  );
}

export const InboxView = observer(function InboxView({ viewModel, onNavigate }: { viewModel: InboxViewModel; onNavigate: (route: RoutePath) => void }): React.ReactElement {
  const t = useT();
  const { status, data } = viewModel;
  let body: React.ReactNode;
  if (status === 'loading') {
    body = (
      <div className="ib-skeleton" aria-busy="true" aria-label={t('clinInbox.loading')} role="status">
        <Skeleton width={200} height={30} />
        <div className="ib-grid"><Skeleton height={420} /><Skeleton height={420} /></div>
      </div>
    );
  } else if (status === 'error') {
    body = <ClinicianErrorState title={t('clinInbox.errorTitle')} reference={t('clinInbox.reference')} onRetry={() => { void viewModel.load(); }} onHelp={() => onNavigate('support')} />;
  } else if (status === 'unconnected') {
    body = <InboxBlank viewModel={viewModel} />;
  } else if (status === 'empty' || !data) {
    body = <ClinicianEmptyState title={t('clinInbox.emptyTitle')} body={t('clinInbox.emptyBody')} action={{ label: t('clinInbox.emptyAction'), onSelect: () => onNavigate('clinician/schedule') }} />;
  } else {
    body = (
      <>
        <Head />
        <div className="ib-grid">
          <section className="ib-list-card" aria-label={t('clinInbox.items')}>
            <div className="ib-filters">
              <Tabs label={t('clinInbox.filterLabel')} variant="chip" options={FILTERS.map((f) => ({ id: f.id, label: t(f.label), count: viewModel.count(f.id) }))} value={viewModel.filter} onChange={viewModel.setFilter} controls="ib-list" />
            </div>
            <ul id="ib-list" className="ib-list">
              {viewModel.shown.map((item) => {
                const kind = KIND[item.kind];
                const on = viewModel.selected?.id === item.id;
                const age = ageText(item.ageMinutes);
                return (
                  <li key={item.id}>
                    <button type="button" className={`ib-item${on ? ' is-on' : ''}`} aria-current={on ? 'true' : undefined} aria-controls="ib-detail" onClick={() => viewModel.select(item.id)}>
                      <span className={`ib-tag sk-tone--${kind.tone}`} aria-hidden="true">{t(kind.tag)}</span>
                      <span className="ib-item__text">
                        <span className="ib-item__who"><span className="sk-visually-hidden">{t(kind.title)}: </span>{item.who}</span>
                        <span className="ib-item__line">{item.line}</span>
                      </span>
                      <span className={`ib-item__age sk-mono${item.kind === 'critical' ? ' is-critical' : ''}`}>{t(age.key, age.vars)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
          <Detail viewModel={viewModel} />
        </div>
      </>
    );
  }
  const outcome = viewModel.outcome;
  return (
    <>
      {body}
      <Toast message={outcome ? t(outcome.key) : null} icon={outcome?.ok ? <Icon name="check-2" size={18} strokeWidth={2.4} /> : undefined} onDone={viewModel.clearOutcome} />
    </>
  );
});

/** Not connected: the inbox layout with nothing in it. Nothing is invented. */
const InboxBlank = observer(function InboxBlank({ viewModel }: { viewModel: InboxViewModel }): React.ReactElement {
  const t = useT();
  return (
    <>
      <Head />
      <div className="ib-grid">
        <section className="ib-list-card" aria-label={t('clinInbox.items')}>
          <div className="ib-filters">
            <Tabs label={t('clinInbox.filterLabel')} variant="chip" options={FILTERS.map((f) => ({ id: f.id, label: t(f.label) }))} value={viewModel.filter} onChange={viewModel.setFilter} controls="ib-list" />
          </div>
          <div id="ib-list" className="ib-blank" role="status">
            <strong>{t('clinInbox.unconnectedTitle')}</strong>
            <span>{t('clinInbox.unconnectedBody')}</span>
          </div>
        </section>
        <section id="ib-detail" className="ib-detail" aria-label={t('clinInbox.selected')}>
          <p className="ib-none">{t('clinInbox.nothingYet')}</p>
        </section>
      </div>
    </>
  );
});

const Detail = observer(function Detail({ viewModel }: { viewModel: InboxViewModel }): React.ReactElement {
  const t = useT();
  const noteId = useId();
  const item = viewModel.selected;
  if (!item) {
    return (
      <section id="ib-detail" className="ib-detail ib-detail--zero" aria-label={t('clinInbox.selected')}>
        <Icon name="check-2" size={44} strokeWidth={2.4} className="ib-zero__icon" />
        <p className="ib-none">{t('clinInbox.zeroFilter')}</p>
      </section>
    );
  }
  const kind = KIND[item.kind];
  const first = item.who.split(',')[0];
  const age = ageText(item.ageMinutes);
  const placeholder = t(kind.placeholder, { name: first });
  return (
    <section id="ib-detail" className="ib-detail" aria-labelledby="ib-detail-title" aria-live="polite">
      <div className="ib-detail__head">
        <span className={`ib-tag ib-tag--lg sk-tone--${kind.tone}`} aria-hidden="true">{t(kind.tag)}</span>
        <span className="ib-detail__titles">
          <h2 id="ib-detail-title" className="ib-detail__title">{t(kind.title)}</h2>
          <span className="ib-detail__who">{t('clinInbox.whoAgo', { who: item.who, age: t(age.key, age.vars) })}</span>
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
                {v.flag !== 'normal' ? <span className="sk-visually-hidden">{t(v.flag === 'critical' ? 'clinInbox.valueCritical' : 'clinInbox.valueOutOfRange')}</span> : null}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      <label className="sk-visually-hidden" htmlFor={noteId}>{placeholder}</label>
      <textarea id={noteId} className="ib-note" rows={5} value={viewModel.text} placeholder={placeholder} onChange={(e) => viewModel.setText(e.target.value)} />
      <div className="ib-actions">
        {kind.actions.map((spec) => (
          <SkButton key={spec.id} variant={spec.variant} busy={viewModel.busy} disabled={!viewModel.canDo(spec)} onClick={() => { void viewModel.act(spec); }}>
            {t(spec.label)}
          </SkButton>
        ))}
      </div>
    </section>
  );
});

export function ClinicianInboxScreen({ source }: { source?: InboxSource }): React.ReactElement {
  const t = useT();
  const [viewModel] = useState(() => new InboxViewModel(source ?? unconnectedInboxSource));
  useEffect(() => { void viewModel.load(); }, [viewModel]);
  return (
    <ClinicianConsoleFrame current="inbox" context={t('console.clin.nav.inbox')}>
      <InboxView viewModel={viewModel} onNavigate={navigate} />
    </ClinicianConsoleFrame>
  );
}
