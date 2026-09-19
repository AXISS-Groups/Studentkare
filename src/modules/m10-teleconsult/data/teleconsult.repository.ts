import { TeleconsultEntity } from '../domain/entities';

export interface ITeleconsultRepository {
  fetchItems(): Promise<TeleconsultEntity[]>;
}

export class TeleconsultRepository implements ITeleconsultRepository {
  async fetchItems(): Promise<TeleconsultEntity[]> {
    return [
      { id: 'teleconsult_1', createdAt: new Date(), updatedAt: new Date() }
    ];
  }
}
