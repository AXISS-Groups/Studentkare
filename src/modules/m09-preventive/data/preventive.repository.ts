import { PreventiveEntity } from '../domain/entities';

export interface IPreventiveRepository {
  fetchItems(): Promise<PreventiveEntity[]>;
}

export class PreventiveRepository implements IPreventiveRepository {
  async fetchItems(): Promise<PreventiveEntity[]> {
    return [
      { id: 'preventive_1', createdAt: new Date(), updatedAt: new Date() }
    ];
  }
}
