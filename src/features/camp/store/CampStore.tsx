import { makeAutoObservable } from 'mobx';
import type { HealthCamp } from '@/types';
import type { StudentStore } from '../../health/store/StudentStore';

/** Domain store for the campus health camp day (stations, badge, check-in). */
/**
 * No camp until a real one is set. This used to default to a fabricated camp
 * whose stations carried invented vitals, BMI and dental findings shown as the
 * student's own results.
 */
const NO_CAMP: HealthCamp = {
  id: '',
  campName: 'No health camp yet',
  institution: '',
  date: '',
  location: '',
  checkInStatus: false,
  qrCode: '',
  stations: [],
  completedCount: 0,
  totalStations: 0,
  digitalBadgeEarned: false,
};

export class CampStore {
  camp: HealthCamp = NO_CAMP;

  constructor(private readonly studentStore: StudentStore) {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  setCamp(camp: HealthCamp): void {
    this.camp = camp;
  }

  completeStation(stationId: string, doctorNote?: string): void {
    const updatedStations = this.camp.stations.map((station) =>
      station.id === stationId
        ? {
            ...station,
            status: 'COMPLETED' as const,
            completedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            doctorNote: doctorNote || station.doctorNote,
          }
        : station
    );
    const completedCount = updatedStations.filter((station) => station.status === 'COMPLETED').length;
    this.camp = {
      ...this.camp,
      stations: updatedStations,
      completedCount,
      digitalBadgeEarned: completedCount === this.camp.totalStations,
    };
    this.studentStore.addPoints(100);
  }
}
