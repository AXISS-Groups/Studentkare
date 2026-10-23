import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from '@/core/navigation';
import { navigate } from '@/lib/utils/workflowRouting';
import { usePhoneHeaderSlot } from '@/design-system/navigation/BoardHeader';
import { OrdersViewModel } from '@/features/orders/viewmodel/OrdersViewModel';
import { useScrollTopOn } from '@/features/phoneKit/useScrollTopOn';
import { M2OrdersView } from './M2OrdersView';
import type { M2OrdersLinks } from './M2OrdersView';

/**
 * Mobile 2.0 Orders on the web: /orders for a signed-in student at phone
 * width (the pill nav's Orders), and `?order=<id>` one order (the link the
 * order-success screen and the old tracking board used).
 */
export function M2OrdersRoute(): React.ReactElement {
  const [vm] = useState(() => new OrdersViewModel());
  const [params] = useSearchParams();
  const routerNavigate = useNavigate();
  const slot = usePhoneHeaderSlot();
  const orderId = params.get('order');
  useScrollTopOn(orderId ?? 'list');

  useEffect(() => {
    if (orderId) void vm.find(orderId);
    else void vm.load();
    return () => vm.dispose();
  }, [vm, orderId]);

  const links: M2OrdersLinks = {
    help: () => navigate('support'),
    sos: () => (slot?.openSos ? slot.openSos() : navigate('sos')),
    shop: () => navigate('shop'),
    buyAgain: () => navigate('buy-again'),
    returnItem: () => navigate('return-request'),
    reports: () => navigate('records'),
    details: (id) => routerNavigate(`/orders?order=${encodeURIComponent(id)}`),
    allOrders: () => routerNavigate('/orders'),
    openEmergencyCard: () => navigate('emergency-card'),
    openPass: () => navigate('pass'),
    openCrisis: () => navigate('sos'),
    refill: (order, item) => routerNavigate(`/health/refills?order=${encodeURIComponent(order)}&item=${encodeURIComponent(item)}`),
  };
  return <M2OrdersView vm={vm} links={links} focusId={orderId} />;
}
