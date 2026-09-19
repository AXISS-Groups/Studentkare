import { LifeshareEntity } from '../domain/entities';

export interface ILifeshareRepository {
  fetchItems(): Promise<LifeshareEntity[]>;
}

export class LifeshareRepository implements ILifeshareRepository {
  async fetchItems(): Promise<LifeshareEntity[]> {
    return [
      { id: 'lifeshare_1', createdAt: new Date(), updatedAt: new Date() }
    ];
  }
}
