import { CareEntity } from '../domain/entities';

export interface ICareRepository {
  fetchItems(): Promise<CareEntity[]>;
}

export class CareRepository implements ICareRepository {
  async fetchItems(): Promise<CareEntity[]> {
    return [
      { id: 'care_1', createdAt: new Date(), updatedAt: new Date() }
    ];
  }
}
