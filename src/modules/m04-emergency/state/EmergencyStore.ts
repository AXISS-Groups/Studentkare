import { makeAutoObservable, runInAction } from 'mobx';
import type { EmergencyStatus, SosAlert } from '../domain/Emergency';
import { isAlertOpen, isEmergencyActive } from '../domain/Emergency';
import { emergencyRepository } from '../data/EmergencyRepository';

/**
 * SOS flow state. Every visible outcome comes from the server's record of what
 * was attempted; on any failure the screen says nothing was sent and points to
 * 112. (The previous store invented an ambulance, a driver, an ETA, a "GPS
 * verified" location and three emergency contacts.)
 */
export class EmergencyStore {
  status: EmergencyStatus = 'IDLE';
  countdownSeconds = 3;
  locationNote = '';
  error = '';
  alert: SosAlert | null = null;

  private countdownTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  get isEmergencyActive(): boolean {
    return isEmergencyActive(this.status);
  }

  setLocationNote(value: string): void {
    this.locationNote = value.slice(0, 300);
  }

  /** Shows an alert that is already open (or the last closed one) when the screen opens. */
  async loadCurrent(): Promise<void> {
    try {
      const alert = await emergencyRepository.current();
      runInAction(() => {
        if (this.status !== 'IDLE') return;
        this.alert = alert;
        if (alert) this.status = isAlertOpen(alert) ? 'OPEN' : 'CLOSED';
      });
    } catch {
      // Not knowing the past alert never blocks raising a new one.
    }
  }

  triggerSos(): void {
    if (this.status !== 'IDLE' && this.status !== 'CLOSED' && this.status !== 'FAILED') return;
    this.status = 'COUNTDOWN';
    this.countdownSeconds = 3;
    this.error = '';
    this.countdownTimer = setInterval(() => {
      runInAction(() => {
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
    this.stopCountdown();
    this.status = this.alert && !isAlertOpen(this.alert) ? 'CLOSED' : 'IDLE';
  }

  async dispatchEmergency(): Promise<void> {
    this.status = 'SENDING';
    try {
      const alert = await emergencyRepository.raiseSos(this.locationNote);
      runInAction(() => {
        this.alert = alert;
        this.status = 'OPEN';
      });
    } catch {
      runInAction(() => {
        this.status = 'FAILED';
        this.error = "We couldn't send your SOS from the app. Call 112 now.";
      });
    }
  }

  /** "I'm safe now" — closes the alert on the server; only then is it shown closed. */
  async cancelAlert(): Promise<void> {
    if (!this.alert) return;
    try {
      const alert = await emergencyRepository.cancel(this.alert.id);
      runInAction(() => {
        this.alert = alert;
        this.status = 'CLOSED';
      });
    } catch {
      runInAction(() => {
        this.error = "Couldn't reach Studentkare to cancel. Your campus may still respond — call them or 112.";
      });
    }
  }

  private stopCountdown(): void {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  }

  reset(): void {
    this.stopCountdown();
    this.status = 'IDLE';
    this.countdownSeconds = 3;
    this.error = '';
    this.alert = null;
    this.locationNote = '';
  }
}

export const emergencyStore = new EmergencyStore();
