import React, { useEffect } from 'react';
import type { ArtSource } from '@/features/phoneKit/artSource';
import { observer } from 'mobx-react-lite';
import { PayStepView } from '@/features/payments/views/PayStepView';
import type { CartPort, PhoneShopViewModel } from '../viewmodel/PhoneShopViewModel';
import { ShopHomeView } from './ShopHomeView';
import { ProductListView } from './ProductListView';
import { ProductDetailView } from './ProductDetailView';
import { CartView } from './CartView';
import { CheckoutView } from './CheckoutView';
import { OrderSuccessView } from './OrderSuccessView';
import { cartMrp, cartTotal } from './shopParts';
import { useScrollTopOn } from '@/features/phoneKit/useScrollTopOn';
import type { ShopLinks } from './shopParts';

/**
 * The phone shop, one board at a time from the view model's stack. The Pay
 * step is the shared one (canvas Payment / PaymentResult); once the server
 * has the payment as paid, the order summary (OrderSuccess) replaces it.
 * Shared by the web phone frame and the Expo app.
 */
export const ShopFlow = observer(function ShopFlow({ vm, cart, links, refillArt, orderArt }: {
  vm: PhoneShopViewModel; cart: CartPort; links: ShopLinks; refillArt?: React.ReactNode; orderArt?: ArtSource;
}) {
  const screen = vm.screen;
  const payment = vm.payment;
  const paidNow = screen.name === 'pay' && payment?.phase === 'paid';
  // The saving is worked out from the cart before it is emptied, for the summary.
  const [saved, setSaved] = React.useState(0);

  useEffect(() => { vm.start(); return () => vm.dispose(); }, [vm]);
  useScrollTopOn(`${vm.stack.length}:${screen.name}`);
  useEffect(() => {
    if (paidNow) {
      setSaved(cartMrp(cart) - cartTotal(cart));
      vm.paid(cart);
    }
  }, [paidNow, vm, cart]);

  switch (screen.name) {
    case 'list': return <ProductListView vm={vm} cart={cart} links={links} />;
    case 'detail': return <ProductDetailView vm={vm} cart={cart} />;
    case 'cart': return <CartView vm={vm} cart={cart} />;
    case 'checkout': return <CheckoutView vm={vm} cart={cart} />;
    case 'pay':
      return payment ? (
        <PayStepView viewModel={payment} onBack={() => vm.back()} onTrack={() => links.trackOrder(payment.orderId)} onOrders={links.openOrders} />
      ) : null;
    case 'success':
      return vm.order ? (
        <OrderSuccessView order={vm.order} savedPaise={saved} art={orderArt} onTrack={() => links.trackOrder(vm.order?.id ?? '')} onShop={vm.home} />
      ) : null;
    default: return <ShopHomeView vm={vm} cart={cart} links={links} refillArt={refillArt} />;
  }
});
