import { CheckoutEntity } from '../domain/entities';

export interface ICheckoutRepository {
  fetchItems(): Promise<CheckoutEntity[]>;
}

export class CheckoutRepository implements ICheckoutRepository {
  async fetchItems(): Promise<CheckoutEntity[]> {
    return [
      { id: 'checkout_1', createdAt: new Date(), updatedAt: new Date() }
    ];
  }
}
