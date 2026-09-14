import { makeAutoObservable } from 'mobx';
import type { CampStation, HealthCamp } from '@/types';
import type { CampStore } from '../store/CampStore';
import type { StudentStore } from '../../health/store/StudentStore';

const DEFAULT_NOTES: Record<string, string> = {
  'st-4': 'Visual acuity 6/6 right eye, 6/6 left eye. Color vision normal.',
};

/**
 * MVVM ViewModel for the campus health camp day (FLOW 05).
 *
 * Wraps the CampStore + StudentStore, exposes computed projections the view
 * binds to, and owns the modal/form UI state (active station, doctor notes).
 */
export class CampViewModel {
  activeModalStationId: string | null = null;
  doctorNoteInput = '';

  constructor(
    private readonly campStore: CampStore,
    private readonly studentStore: StudentStore
  ) {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  get camp(): HealthCamp {
    return this.campStore.camp;
  }

  get studentName(): string {
    return this.studentStore.student.fullName;
  }

  get progressPercent(): number {
    if (this.camp.totalStations === 0) return 0;
    return Math.round((this.camp.completedCount / this.camp.totalStations) * 100);
  }

  get activeModalStation(): CampStation | null {
    return this.camp.stations.find((station) => station.id === this.activeModalStationId) ?? null;
  }

  get canConfirm(): boolean {
    return this.doctorNoteInput.trim().length > 0;
  }

  openCompleteModal(station: CampStation): void {
    this.activeModalStationId = station.id;
    this.doctorNoteInput = DEFAULT_NOTES[station.id] ?? 'All 5 stations reviewed. Student health passport certified.';
  }

  setDoctorNote(value: string): void {
    this.doctorNoteInput = value;
  }

  confirmComplete(): void {
    if (!this.activeModalStationId) return;
    this.campStore.completeStation(this.activeModalStationId, this.doctorNoteInput);
    this.closeModal();
  }

  closeModal(): void {
    this.activeModalStationId = null;
    this.doctorNoteInput = '';
  }

  stationStatus(station: CampStation): 'done' | 'next' | 'pending' {
    if (station.status === 'COMPLETED') return 'done';
    if (station.status === 'IN_QUEUE') return 'next';
    return 'pending';
  }
}
