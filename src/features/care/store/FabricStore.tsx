import { makeAutoObservable } from 'mobx';
import { initialFabricProviders, initialFabricOrders } from '@/data/mockData';
import type { FabricProvider, FabricOrder, OrderState } from '@/types';
import type { StudentStore } from '../../health/store/StudentStore';

/** Domain store for the health-services fabric (providers + order workflow). */
export class FabricStore {
  fabricProviders: FabricProvider[] = initialFabricProviders;
  fabricOrders: FabricOrder[] = initialFabricOrders;

  constructor(private readonly studentStore: StudentStore) {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  setFabricProviders(providers: FabricProvider[]): void {
    this.fabricProviders = providers;
  }

  setFabricOrders(orders: FabricOrder[]): void {
    this.fabricOrders = orders;
  }

  advanceOrderState(orderId: string, nextState: OrderState): void {
    this.fabricOrders = this.fabricOrders.map((order) => {
      if (order.id !== orderId) return order;
      const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 16);
      return {
        ...order,
        state: nextState,
        stateHistory: [...order.stateHistory, { state: nextState, timestamp, note: `State updated to ${nextState.toUpperCase()}` }],
      };
    });
  }

  createFabricOrder(orderData: Partial<FabricOrder>): FabricOrder {
    const newOrder: FabricOrder = {
      id: `ORD-FAB-${Math.floor(1000 + Math.random() * 9000)}`,
      partnerId: orderData.partnerId || 'PARTNER-CAMPUS-CORE',
      partnerName: orderData.partnerName || 'Campus Internal Health App',
      serviceCategory: orderData.serviceCategory || 'DIAGNOSTICS',
      serviceCodeLoinc: orderData.serviceCodeLoinc || '58410-2',
      serviceName: orderData.serviceName || 'Diagnostic Panel',
      pincode: orderData.pincode || '502285',
      modality: orderData.modality || 'HOME_COLLECTION',
      assignedProviderId: 'PROV-101',
      assignedProviderName: 'Dr. Lal PathLabs · Central Hub',
      fallbackProviderId: 'PROV-102',
      state: 'created',
      stateHistory: [
        {
          state: 'created',
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
          note: 'Order initiated',
        },
      ],
      patientId: this.studentStore.student.id,
      patientName: this.studentStore.student.fullName,
      providerCost: 350,
      partnerPrice: 550,
      settlementStatus: 'UNBILLED',
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      ...orderData,
    };
    this.fabricOrders = [newOrder, ...this.fabricOrders];
    return newOrder;
  }
}
