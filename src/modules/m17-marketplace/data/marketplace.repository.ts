import { MarketplaceEntity } from '../domain/entities';

export interface IMarketplaceRepository {
  fetchItems(): Promise<MarketplaceEntity[]>;
}

export class MarketplaceRepository implements IMarketplaceRepository {
  async fetchItems(): Promise<MarketplaceEntity[]> {
    return [
      { id: 'marketplace_1', createdAt: new Date(), updatedAt: new Date() }
    ];
  }
}
