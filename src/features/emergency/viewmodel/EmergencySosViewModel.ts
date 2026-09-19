import { runInAction } from 'mobx';
import { AutoObservableViewModel } from '@/core/store/ViewModel';

export type EmergencyStatus = 'IDLE' | 'COUNTDOWN' | 'DISPATCHED' | 'CANCELLED';

export interface EmergencyContact {
  id: string;
  name: string;
  relation: string;
  phone: string;
  notified: boolean;
}

export interface AmbulanceDispatchInfo {
  unitId: string;
  driverName: string;
  driverPhone: string;
  etaMinutes: number;
  currentLocation: string;
}

export class EmergencySosViewModel extends AutoObservableViewModel {
  public status: EmergencyStatus = 'IDLE';
  public countdownSeconds = 3;
  public userLocation = 'Main Library Quad, Sector 4, Campus West';
  public isLocating = false;
  public error = '';
  public activeDispatch: AmbulanceDispatchInfo | null = null;
  public emergencyContacts: EmergencyContact[] = [
    { id: '1', name: 'Dr. Ramesh Kumar (Campus MO)', relation: 'Chief Medical Officer', phone: '+91 98765 43210', notified: false },
    { id: '2', name: 'Campus Security Control', relation: '24/7 Security Hotline', phone: '+91 98765 00000', notified: false },
    { id: '3', name: 'Sunita Sharma', relation: 'Parent / Primary Contact', phone: '+91 91234 56789', notified: false },
  ];

  private countdownTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    super();
  }

  public triggerSos(): void {
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
          this.dispatchEmergency();
        }
      });
    }, 1000);
  }

  public cancelSos(): void {
    this.stopCountdown();
    this.status = 'CANCELLED';
    this.activeDispatch = null;
    this.emergencyContacts = this.emergencyContacts.map(c => ({ ...c, notified: false }));
  }

  private stopCountdown(): void {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  }

  public dispatchEmergency(): void {
    this.status = 'DISPATCHED';
    this.activeDispatch = {
      unitId: 'AMB-UNIT-04',
      driverName: 'Suresh Patil',
      driverPhone: '+91 99887 76655',
      etaMinutes: 4,
      currentLocation: 'En route via University Gate #2',
    };
    this.emergencyContacts = this.emergencyContacts.map(c => ({ ...c, notified: true }));
  }

  public refreshLocation(): void {
    this.isLocating = true;
    setTimeout(() => {
      runInAction(() => {
        this.userLocation = 'Student Housing Block B, Floor 3 (GPS Verified)';
        this.isLocating = false;
      });
    }, 800);
  }

  public override reset(): void {
    this.stopCountdown();
    this.status = 'IDLE';
    this.countdownSeconds = 3;
    this.error = '';
    this.activeDispatch = null;
    this.emergencyContacts = this.emergencyContacts.map(c => ({ ...c, notified: false }));
  }

  public override dispose(): void {
    this.stopCountdown();
  }
}
