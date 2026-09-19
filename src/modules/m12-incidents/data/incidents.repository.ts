import { IncidentsEntity } from '../domain/entities';

export interface IIncidentsRepository {
  fetchItems(): Promise<IncidentsEntity[]>;
}

export class IncidentsRepository implements IIncidentsRepository {
  async fetchItems(): Promise<IncidentsEntity[]> {
    return [
      { id: 'incidents_1', createdAt: new Date(), updatedAt: new Date() }
    ];
  }
}
