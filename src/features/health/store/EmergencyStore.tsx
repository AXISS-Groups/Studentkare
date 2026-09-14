import { makeAutoObservable } from 'mobx';

/** Domain store for the campus emergency signal (SOS / alarm state). */
export class EmergencyStore {
  emergencyActive = false;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  triggerEmergency(): void {
    this.emergencyActive = true;
  }

  cancelEmergency(): void {
    this.emergencyActive = false;
  }
}
