import { Digital_idEntity } from '../domain/entities';

export interface IDigital_idRepository {
  fetchItems(): Promise<Digital_idEntity[]>;
}

export class Digital_idRepository implements IDigital_idRepository {
  async fetchItems(): Promise<Digital_idEntity[]> {
    return [
      { id: 'digital_id_1', createdAt: new Date(), updatedAt: new Date() }
    ];
  }
}
