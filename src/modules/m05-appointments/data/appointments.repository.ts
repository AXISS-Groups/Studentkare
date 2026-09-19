import { AppointmentsEntity } from '../domain/entities';

export interface IAppointmentsRepository {
  fetchItems(): Promise<AppointmentsEntity[]>;
}

export class AppointmentsRepository implements IAppointmentsRepository {
  async fetchItems(): Promise<AppointmentsEntity[]> {
    return [
      { id: 'appointments_1', createdAt: new Date(), updatedAt: new Date() }
    ];
  }
}
