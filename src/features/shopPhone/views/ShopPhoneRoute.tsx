import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from '@/core/navigation';
import { useLiveCart } from '@/data/contexts/LiveCartContext';
import { navigate } from '@/lib/utils/workflowRouting';
import { LabBookingOverlay } from '@/features/labBooking/views/LabBookingOverlay';
import { phoneArt } from '@/features/phoneKit/phoneArt';
import { PhoneShopViewModel } from '../viewmodel/PhoneShopViewModel';
import type { CartPort, ShopScreen } from '../viewmodel/PhoneShopViewModel';
import { ShopFlow } from './ShopFlow';
import type { ShopLinks } from './shopParts';

/** The board a URL opens: `/checkout` the cart, `?product=` a product, `?category=` / `?q=` a list. */
export function initialShopScreen(route: 'shop' | 'checkout', params: URLSearchParams): ShopScreen {
  if (route === 'checkout') return { name: 'cart' };
  const product = params.get('product');
  if (product) return { name: 'detail', itemId: product };
  const category = params.get('category') ?? '';
  const query = params.get('q') ?? '';
  if (category || query) return { name: 'list', category, query };
  return { name: 'home' };
}

/**
 * /shop and /checkout for a signed-in student at phone width (the phone
 * boards ShopHome … OrderSuccess inside the student phone frame). The cart is
 * the web's LiveCart, so it is the same cart the desktop shop shows.
 */
export function ShopPhoneRoute({ route }: { route: 'shop' | 'checkout' }): React.ReactElement {
  const [params] = useSearchParams();
  const routerNavigate = useNavigate();
  const [vm] = useState(() => new PhoneShopViewModel(initialShopScreen(route, params)));
  const live = useLiveCart();
  const [labItemId, setLabItemId] = useState<string | null>(null);
  const cart: CartPort = useMemo(() => ({ lines: live.lines, add: live.add, setQuantity: live.setQuantity, clear: live.clear }), [live]);

  const links: ShopLinks = {
    exit: () => navigate('health'),
    openMyHealth: () => navigate('your-care'),
    openSearch: () => navigate('search'),
    openRewards: () => navigate('rewards'),
    openRefill: () => navigate('refill-request'),
    openPrescriptions: () => navigate('prescriptions'),
    openRecords: () => navigate('records'),
    openLabTests: () => navigate('lab-tests'),
    bookLab: setLabItemId,
    trackOrder: (orderId) => routerNavigate(`/orders?order=${encodeURIComponent(orderId)}`),
    openOrders: () => navigate('orders'),
    openMedicineInfo: (medicineId) => routerNavigate(medicineId ? `/medicine-info?medicine=${encodeURIComponent(medicineId)}` : '/medicine-info'),
  };

  return (
    <>
      <ShopFlow vm={vm} cart={cart} links={links} orderArt={phoneArt.orderPlaced} />
      {labItemId ? <LabBookingOverlay itemId={labItemId} onClose={() => setLabItemId(null)} /> : null}
    </>
  );
}
