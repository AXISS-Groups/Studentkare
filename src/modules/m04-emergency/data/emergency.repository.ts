import { EmergencyEntity } from '../domain/entities';

export interface IEmergencyRepository {
  fetchItems(): Promise<EmergencyEntity[]>;
}

export class EmergencyRepository implements IEmergencyRepository {
  async fetchItems(): Promise<EmergencyEntity[]> {
    return [
      { id: 'emergency_1', createdAt: new Date(), updatedAt: new Date() }
    ];
  }
}
