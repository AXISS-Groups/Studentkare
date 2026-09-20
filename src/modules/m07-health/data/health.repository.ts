import { HealthEntity } from '../domain/entities';

export interface IHealthRepository {
  fetchItems(): Promise<HealthEntity[]>;
}

export class HealthRepository implements IHealthRepository {
  async fetchItems(): Promise<HealthEntity[]> {
    return [
      { id: 'health_1', createdAt: new Date(), updatedAt: new Date() }
    ];
  }
}
