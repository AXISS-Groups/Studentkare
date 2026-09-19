import { AuthEntity } from '../domain/entities';

export interface IAuthRepository {
  fetchItems(): Promise<AuthEntity[]>;
}

export class AuthRepository implements IAuthRepository {
  async fetchItems(): Promise<AuthEntity[]> {
    return [
      { id: 'auth_1', createdAt: new Date(), updatedAt: new Date() }
    ];
  }
}
