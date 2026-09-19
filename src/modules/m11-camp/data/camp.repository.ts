import { CampEntity } from '../domain/entities';

export interface ICampRepository {
  fetchItems(): Promise<CampEntity[]>;
}

export class CampRepository implements ICampRepository {
  async fetchItems(): Promise<CampEntity[]> {
    return [
      { id: 'camp_1', createdAt: new Date(), updatedAt: new Date() }
    ];
  }
}
