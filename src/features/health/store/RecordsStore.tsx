import { makeAutoObservable } from 'mobx';
import { initialRecords } from '@/data/mockData';
import type { HealthRecord } from '@/types';

/**
 * Domain store for the student's health records. Adding a record earns nothing:
 * Rule L forbids gamifying health data (audit 04), so this store no longer
 * depends on StudentStore's points.
 */
export class RecordsStore {
  records: HealthRecord[] = initialRecords;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  addRecord(record: HealthRecord): void {
    this.records = [record, ...this.records];
  }

  deleteRecord(id: string): void {
    this.records = this.records.filter((record) => record.id !== id);
  }
}
