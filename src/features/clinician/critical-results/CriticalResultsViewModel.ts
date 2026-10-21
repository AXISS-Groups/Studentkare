import { actionBound, computed, makeObservable, observable, runInAction } from 'mobx';
import { LoadableViewModel } from '../shared/LoadableViewModel';
import type { T } from '../shared/clinicalData';
import type { AckState, CriticalData, CriticalResult, CriticalSource, Escalation } from './criticalModel';
import { bySeverity } from './criticalModel';

export type CriticalTab = 'unacknowledged' | 'all' | 'never-collected';

export class CriticalResultsViewModel extends LoadableViewModel<CriticalData> {
  tab: CriticalTab = 'unacknowledged';
  openId: string | null = null;
  /** No escalation is pre-chosen: the doctor picks one deliberately. */
  escalation: Escalation | null = null;
  busy = false;

  constructor(private readonly source: CriticalSource, private readonly t: T) {
    super(source);
    makeObservable<CriticalResultsViewModel, 'setAck'>(this, {
      tab: observable, openId: observable, escalation: observable, busy: observable, online: observable,
      visible: computed, open: computed, canAcknowledge: computed, canChase: computed,
      setOnline: actionBound, setTab: actionBound, openResult: actionBound, close: actionBound, choose: actionBound, setAck: actionBound,
    });
  }

  protected isEmpty(data: CriticalData): boolean {
    return data.results.length === 0;
  }

  get visible(): CriticalResult[] {
    const all = bySeverity(this.data?.results ?? []);
    if (this.tab === 'all') return all;
    return all.filter((r) => r.ack === this.tab);
  }

  get open(): CriticalResult | null {
    return this.data?.results.find((r) => r.id === this.openId) ?? null;
  }

  /** Offline, nothing is written: the list stays readable, every write is off. */
  online = true;

  get canAcknowledge(): boolean {
    return !!this.open && this.open.ack === 'unacknowledged' && this.escalation !== null && !this.busy && this.online && typeof this.source.acknowledge === 'function';
  }

  /** Whether "Chase" can do anything: only with a reminder service, and online. */
  get canChase(): boolean {
    return typeof this.source.chase === 'function' && this.online;
  }

  setOnline(online: boolean): void {
    this.online = online;
  }

  setTab(tab: CriticalTab): void {
    this.tab = tab;
  }

  openResult(id: string): void {
    this.openId = id;
    this.escalation = null;
  }

  close(): void {
    if (this.busy) return;
    this.openId = null;
    this.escalation = null;
  }

  choose(escalation: Escalation): void {
    this.escalation = escalation;
  }

  private setAck(id: string, ack: AckState, ackText: string): void {
    if (!this.data) return;
    this.data = { ...this.data, results: this.data.results.map((r) => (r.id === id ? { ...r, ack, ackText } : r)) };
  }

  /**
   * Fails closed: without a chosen escalation, or when the source cannot
   * record it, nothing is acknowledged. The row changes only after the source
   * accepts.
   */
  async acknowledge(): Promise<void> {
    const result = this.open;
    const escalation = this.escalation;
    const record = this.source.acknowledge;
    if (!result || !escalation || !record || !this.canAcknowledge) return;
    this.busy = true;
    try {
      await record(result.id, escalation);
      runInAction(() => {
        this.setAck(result.id, 'acknowledged', this.t('clinCritical.ackJustNow'));
        this.busy = false;
        this.openId = null;
        this.escalation = null;
        this.say(this.t(escalation === 'call' ? 'clinCritical.toast.call' : escalation === 'clinic' ? 'clinCritical.toast.clinic' : 'clinCritical.toast.followUp'));
      });
    } catch {
      runInAction(() => {
        this.busy = false;
        this.say(this.t('clinCritical.toast.ackFailed'));
      });
    }
  }

  async chase(id: string): Promise<void> {
    const chase = this.source.chase;
    if (!chase || !this.canChase) return;
    try {
      await chase(id);
      runInAction(() => this.say(this.t('clinCritical.toast.chased')));
    } catch {
      runInAction(() => this.say(this.t('clinCritical.toast.chaseFailed')));
    }
  }
}
