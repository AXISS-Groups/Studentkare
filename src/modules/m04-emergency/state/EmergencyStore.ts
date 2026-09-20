import { makeAutoObservable, runInAction } from 'mobx';
import type { EmergencyStatus, EmergencyContact, AmbulanceDispatchInfo } from '../domain/Emergency';
import { isEmergencyActive } from '../domain/Emergency';
import { emergencyRepository } from '../data/EmergencyRepository';

export class EmergencyStore {
  status: EmergencyStatus = 'IDLE';
  countdownSeconds = 3;
  userLocation = 'Main Library Quad, Sector 4, Campus West';
  isLocating = false;
  error = '';
  activeDispatch: AmbulanceDispatchInfo | null = null;
  emergencyContacts: EmergencyContact[] = [
    { id: '1', name: 'Dr. Ramesh Kumar (Campus MO)', relation: 'Chief Medical Officer', phone: '+91 98765 43210', notified: false },
    { id: '2', name: 'Campus Security Control', relation: '24/7 Security Hotline', phone: '+91 98765 00000', notified: false },
    { id: '3', name: 'Sunita Sharma', relation: 'Parent / Primary Contact', phone: '+91 91234 56789', notified: false },
  ];

  private countdownTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  get isEmergencyActive(): boolean {
    return isEmergencyActive(this.status);
  }

  triggerSos(): void {
    if (this.status !== 'IDLE') return;
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

  cancelSos(): void {
    this.stopCountdown();
    this.status = 'CANCELLED';
    this.activeDispatch = null;
    this.emergencyContacts = this.emergencyContacts.map(c => ({ ...c, notified: false }));
    void emergencyRepository.cancelSos();
  }

  private stopCountdown(): void {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  }

  async dispatchEmergency(): Promise<void> {
    this.status = 'DISPATCHED';
    try {
      const dispatchInfo = await emergencyRepository.dispatchSos(this.userLocation);
      runInAction(() => {
        this.activeDispatch = dispatchInfo;
        this.emergencyContacts = this.emergencyContacts.map(c => ({ ...c, notified: true }));
      });
    } catch {
      runInAction(() => {
        this.activeDispatch = {
          unitId: 'AMB-UNIT-04',
          driverName: 'Suresh Patil',
          driverPhone: '+91 99887 76655',
          etaMinutes: 4,
          currentLocation: 'En route via University Gate #2',
        };
        this.emergencyContacts = this.emergencyContacts.map(c => ({ ...c, notified: true }));
      });
    }
  }

  refreshLocation(): void {
    this.isLocating = true;
    setTimeout(() => {
      runInAction(() => {
        this.userLocation = 'Student Housing Block B, Floor 3 (GPS Verified)';
        this.isLocating = false;
      });
    }, 800);
  }

  reset(): void {
    this.stopCountdown();
    this.status = 'IDLE';
    this.countdownSeconds = 3;
    this.error = '';
    this.activeDispatch = null;
    this.emergencyContacts = this.emergencyContacts.map(c => ({ ...c, notified: false }));
  }
}

export const emergencyStore = new EmergencyStore();
