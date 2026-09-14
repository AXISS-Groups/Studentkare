import { makeAutoObservable } from 'mobx';
import type { FabricOrder, FabricProvider, OrderState } from '@/types';
import type { FabricStore } from '../store/FabricStore';

export const ORDER_STATE_MACHINE: OrderState[] = [
  'created',
  'routed',
  'accepted',
  'scheduled',
  'in_progress',
  'fulfilled',
  'reported',
  'settled',
];

export interface OrderStep {
  state: OrderState;
  isCurrent: boolean;
  isPassed: boolean;
}

/**
 * MVVM ViewModel for the health-services fabric fulfilment orchestrator (M20).
 *
 * Wraps the FabricStore and owns the 8-stage order state-machine logic so the
 * view only binds to projections (`orders`, `providers`, `nextState`).
 */
export class FabricViewModel {
  constructor(private readonly fabricStore: FabricStore) {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  get orders(): FabricOrder[] {
    return this.fabricStore.fabricOrders;
  }

  get providers(): FabricProvider[] {
    return this.fabricStore.fabricProviders;
  }

  nextState(current: OrderState): OrderState | null {
    const idx = ORDER_STATE_MACHINE.indexOf(current);
    if (idx !== -1 && idx < ORDER_STATE_MACHINE.length - 1) return ORDER_STATE_MACHINE[idx + 1];
    return null;
  }

  stepsFor(current: OrderState): OrderStep[] {
    const idx = ORDER_STATE_MACHINE.indexOf(current);
    return ORDER_STATE_MACHINE.map((state, index) => ({
      state,
      isCurrent: state === current,
      isPassed: idx >= index,
    }));
  }

  advance(order: FabricOrder): void {
    const next = this.nextState(order.state);
    if (next) this.fabricStore.advanceOrderState(order.id, next);
  }
}
