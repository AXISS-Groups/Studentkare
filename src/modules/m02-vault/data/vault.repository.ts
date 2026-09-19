import { VaultEntity } from '../domain/entities';

export interface IVaultRepository {
  fetchItems(): Promise<VaultEntity[]>;
}

export class VaultRepository implements IVaultRepository {
  async fetchItems(): Promise<VaultEntity[]> {
    return [
      { id: 'vault_1', createdAt: new Date(), updatedAt: new Date() }
    ];
  }
}
