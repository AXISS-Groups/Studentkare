import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from '@/core/navigation';
import { navigate } from '@/lib/utils/workflowRouting';
import { OrdersViewModel } from '../viewmodel/OrdersViewModel';
import { OrderHistoryView } from './OrderHistoryView';
import type { OrdersLinks } from './OrderHistoryView';
import { OrderTrackingView } from './OrderTrackingView';
import { useScrollTopOn } from '@/features/phoneKit/useScrollTopOn';

function leave(): void {
  if (typeof window !== 'undefined' && window.history.length > 1) window.history.back();
  else navigate('health');
}

/**
 * /orders for a signed-in student at phone width: the order history (canvas
 * OrderHistory), and `?order=<id>` one order's tracking (OrderTracking).
 */
export function OrdersPhoneRoute(): React.ReactElement {
  const [vm] = useState(() => new OrdersViewModel());
  const [params] = useSearchParams();
  const routerNavigate = useNavigate();
  const orderId = params.get('order');
  useScrollTopOn(orderId ?? 'list');

  useEffect(() => {
    if (orderId) void vm.find(orderId);
    else void vm.load();
    return () => vm.dispose();
  }, [vm, orderId]);

  const links: OrdersLinks = {
    back: leave,
    openShop: () => navigate('shop'),
    track: (id) => routerNavigate(`/orders?order=${encodeURIComponent(id)}`),
    openEmergencyCard: () => navigate('emergency-card'),
    openPass: () => navigate('pass'),
    openCrisis: () => navigate('sos'),
  };

  if (orderId) {
    return (
      <OrderTrackingView vm={vm} orderId={orderId}
        links={{ back: leave, allOrders: () => routerNavigate('/orders'), support: () => navigate('support') }} />
    );
  }
  return <OrderHistoryView vm={vm} links={links} />;
}
