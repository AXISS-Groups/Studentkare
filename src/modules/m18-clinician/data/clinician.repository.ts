import { ClinicianEntity } from '../domain/entities';

export interface IClinicianRepository {
  fetchItems(): Promise<ClinicianEntity[]>;
}

export class ClinicianRepository implements IClinicianRepository {
  async fetchItems(): Promise<ClinicianEntity[]> {
    return [
      { id: 'clinician_1', createdAt: new Date(), updatedAt: new Date() }
    ];
  }
}
