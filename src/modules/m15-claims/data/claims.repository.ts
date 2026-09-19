import { ClaimsEntity } from '../domain/entities';

export interface IClaimsRepository {
  fetchItems(): Promise<ClaimsEntity[]>;
}

export class ClaimsRepository implements IClaimsRepository {
  async fetchItems(): Promise<ClaimsEntity[]> {
    return [
      { id: 'claims_1', createdAt: new Date(), updatedAt: new Date() }
    ];
  }
}
