import { makeAutoObservable, runInAction } from 'mobx';
import type { MessageKey } from '@/i18n';
import { captureSessionScope, isCurrentSessionScope, subscribeSessionScope } from '@/core/session/sessionScope';
import type { SessionScope } from '@/core/session/sessionScope';
import type { EmergencyStatus, SosAlert } from '../domain/Emergency';
import { isAlertOpen, isEmergencyActive } from '../domain/Emergency';
import { emergencyRepository } from '../data/EmergencyRepository';

/**
 * SOS flow state. Every visible outcome comes from the server's record of what
 * was attempted; on any failure the screen says nothing was sent and points to
 * 112. (The previous store invented an ambulance, a driver, an ETA, a "GPS
 * verified" location and three emergency contacts.)
 */
class EmergencyStore {
  status: EmergencyStatus = 'IDLE';
  countdownSeconds = 3;
  locationNote = '';
  /** A message key (translated by the view), or '' for none. */
  error: MessageKey | '' = '';
  refreshError: MessageKey | '' = '';
  alert: SosAlert | null = null;

  private countdownTimer: ReturnType<typeof setInterval> | null = null;
  private resetRevision = 0;
  private alertRevision = 0;
  private currentRequest = 0;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
    subscribeSessionScope(this.reset);
  }

  get isEmergencyActive(): boolean {
    return isEmergencyActive(this.status);
  }

  setLocationNote(value: string): void {
    this.locationNote = value.slice(0, 300);
  }

  /** Shows an alert that is already open (or the last closed one) when the screen opens. */
  async loadCurrent(): Promise<void> {
    const scope = captureSessionScope();
    const revision = this.resetRevision;
    if (!this.isCurrentOperation(scope, revision)) return;
    if (this.status === 'COUNTDOWN' || this.status === 'SENDING') return;
    const alertRevision = this.alertRevision;
    const request = ++this.currentRequest;
    const canApply = () => this.isCurrentOperation(scope, revision)
      && alertRevision === this.alertRevision && request === this.currentRequest;
    try {
      const alert = await emergencyRepository.current();
      runInAction(() => {
        if (!canApply()) return;
        this.alert = alert;
        this.status = alert ? (isAlertOpen(alert) ? 'OPEN' : 'CLOSED') : 'IDLE';
        this.refreshError = '';
      });
    } catch {
      runInAction(() => {
        if (!canApply()) return;
        this.refreshError = 'sos.refreshFailed';
      });
    }
  }

  triggerSos(): void {
    const scope = captureSessionScope();
    const revision = this.resetRevision;
    if (!this.isCurrentOperation(scope, revision)) return;
    if (this.status !== 'IDLE' && this.status !== 'CLOSED' && this.status !== 'FAILED') return;
    this.alertRevision += 1;
    this.status = 'COUNTDOWN';
    this.countdownSeconds = 3;
    this.error = '';
    this.countdownTimer = setInterval(() => {
      runInAction(() => {
        if (!this.isCurrentOperation(scope, revision)) return;
        if (this.countdownSeconds > 1) {
          this.countdownSeconds -= 1;
        } else {
          this.stopCountdown();
          void this.dispatchEmergency();
        }
      });
    }, 1000);
  }

  cancelCountdown(): void {
    this.alertRevision += 1;
    this.stopCountdown();
    this.status = this.alert && !isAlertOpen(this.alert) ? 'CLOSED' : 'IDLE';
  }

  async dispatchEmergency(): Promise<void> {
    const scope = captureSessionScope();
    const revision = this.resetRevision;
    if (!this.isCurrentOperation(scope, revision)) return;
    this.alertRevision += 1;
    this.status = 'SENDING';
    try {
      const alert = await emergencyRepository.raiseSos(this.locationNote);
      runInAction(() => {
        if (!this.isCurrentOperation(scope, revision)) return;
        this.alertRevision += 1;
        this.alert = alert;
        this.status = 'OPEN';
        this.refreshError = '';
      });
    } catch {
      runInAction(() => {
        if (!this.isCurrentOperation(scope, revision)) return;
        this.alertRevision += 1;
        this.status = 'FAILED';
        this.error = 'sos.sendFailed';
      });
    }
  }

  /** "I'm safe now" — closes the alert on the server; only then is it shown closed. */
  async cancelAlert(): Promise<void> {
    const scope = captureSessionScope();
    const revision = this.resetRevision;
    if (!this.isCurrentOperation(scope, revision)) return;
    if (!this.alert) return;
    this.alertRevision += 1;
    try {
      const alert = await emergencyRepository.cancel(this.alert.id);
      runInAction(() => {
        if (!this.isCurrentOperation(scope, revision)) return;
        this.alertRevision += 1;
        this.alert = alert;
        this.status = 'CLOSED';
        this.refreshError = '';
      });
    } catch {
      runInAction(() => {
        if (!this.isCurrentOperation(scope, revision)) return;
        this.alertRevision += 1;
        this.error = 'sos.cancelFailed';
      });
    }
  }

  private stopCountdown(): void {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  }

  private isCurrentOperation(scope: SessionScope, revision: number): boolean {
    return isCurrentSessionScope(scope) && revision === this.resetRevision;
  }

  /** Clears only local state; an alert on the server remains open until explicitly ended. */
  reset(): void {
    this.resetRevision += 1;
    this.stopCountdown();
    this.status = 'IDLE';
    this.countdownSeconds = 3;
    this.error = '';
    this.refreshError = '';
    this.alert = null;
    this.locationNote = '';
  }
}

export const emergencyStore = new EmergencyStore();
