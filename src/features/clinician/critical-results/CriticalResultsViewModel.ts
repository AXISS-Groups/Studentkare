import { actionBound, computed, makeObservable, observable, runInAction } from 'mobx';
import { LoadableViewModel } from '../shared/LoadableViewModel';
import type { AckState, CriticalData, CriticalResult, CriticalSource, Escalation } from './criticalModel';
import { bySeverity } from './criticalModel';

export type CriticalTab = 'unacknowledged' | 'all' | 'never-collected';

export class CriticalResultsViewModel extends LoadableViewModel<CriticalData> {
  tab: CriticalTab = 'unacknowledged';
  openId: string | null = null;
  /** No escalation is pre-chosen: the doctor picks one deliberately. */
  escalation: Escalation | null = null;
  busy = false;

  constructor(private readonly source: CriticalSource) {
    super(source);
    makeObservable<CriticalResultsViewModel, 'setAck'>(this, {
      tab: observable, openId: observable, escalation: observable, busy: observable,
      visible: computed, open: computed, canAcknowledge: computed,
      setTab: actionBound, openResult: actionBound, close: actionBound, choose: actionBound, setAck: actionBound,
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

  get canAcknowledge(): boolean {
    return !!this.open && this.open.ack === 'unacknowledged' && this.escalation !== null && !this.busy && typeof this.source.acknowledge === 'function';
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
        this.setAck(result.id, 'acknowledged', 'Acknowledged just now');
        this.busy = false;
        this.openId = null;
        this.escalation = null;
        const first = result.patientName.split(' ')[0];
        this.say(escalation === 'call' ? `Acknowledged · calling ${first} is logged` : escalation === 'clinic' ? `Acknowledged · routed to ${result.campus} clinic` : 'Acknowledged · follow-up task on your queue');
      });
    } catch {
      runInAction(() => {
        this.busy = false;
        this.say('Couldn’t record the acknowledgement. It is still unacknowledged — try again.');
      });
    }
  }

  async chase(id: string): Promise<void> {
    const chase = this.source.chase;
    if (!chase) return;
    try {
      await chase(id);
      runInAction(() => this.say('Reminder sent to book a new collection slot'));
    } catch {
      runInAction(() => this.say('Couldn’t send the reminder. Nothing was sent.'));
    }
  }
}
