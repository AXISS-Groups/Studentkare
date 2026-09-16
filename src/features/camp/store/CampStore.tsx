import { makeAutoObservable } from 'mobx';
import { initialCamp } from '@/data/mockData';
import type { HealthCamp } from '@/types';
import type { StudentStore } from '../../health/store/StudentStore';

/** Domain store for the campus health camp day (stations, badge, check-in). */
export class CampStore {
  camp: HealthCamp = initialCamp;

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
            doctorNote: doctorNote || station.doctorNote || 'Verified and completed by station officer',
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
