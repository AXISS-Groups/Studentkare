import { ScannersEntity } from '../domain/entities';

export interface IScannersRepository {
  fetchItems(): Promise<ScannersEntity[]>;
}

export class ScannersRepository implements IScannersRepository {
  async fetchItems(): Promise<ScannersEntity[]> {
    return [
      { id: 'scanners_1', createdAt: new Date(), updatedAt: new Date() }
    ];
  }
}
