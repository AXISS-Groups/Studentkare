import { makeAutoObservable } from 'mobx';
import { initialRecords } from '@/data/mockData';
import type { HealthRecord } from '@/types';
import type { StudentStore } from '../../health/store/StudentStore';

/**
 * Domain store for the student's health records. Awards care points on new
 * records (via the student store) — a cross-store dependency, kept explicit.
 */
export class RecordsStore {
  records: HealthRecord[] = initialRecords;

  constructor(private readonly studentStore: StudentStore) {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  addRecord(record: HealthRecord): void {
    this.records = [record, ...this.records];
    this.studentStore.addPoints(50);
  }

  deleteRecord(id: string): void {
    this.records = this.records.filter((record) => record.id !== id);
  }
}
