import React, { useEffect, useState } from 'react';
import { PILL_NAV_HEIGHT } from '@/design-system/m2';
import type { CartPort } from '../viewmodel/PhoneShopViewModel';
import { M2ProductViewModel } from '../viewmodel/M2ProductViewModel';
import { M2ProductView } from './M2ProductView';
import type { M2ProductLinks } from './M2ProductView';
import { cartCount } from './shopParts';

/** Add `quantity` of an item to a cart that keeps one line per listing. */
export function addToCart(cart: CartPort, item: Parameters<CartPort['add']>[0], quantity: number): void {
  const line = cart.lines.find((l) => l.item.id === item.id);
  if (!line) cart.add(item);
  cart.setQuantity(item.id, (line?.quantity ?? 0) + quantity);
}

/**
 * The web phone shop's medicine page (Mobile 2.0 M2Product): one view model
 * per listing opened, the web cart, and room for the floating pill nav.
 */
export function M2ProductBoard({ itemId, cart, links }: {
  itemId: string; cart: CartPort; links: Omit<M2ProductLinks, 'add'> & { afterAdd: () => void };
}): React.ReactElement {
  const [vm] = useState(() => new M2ProductViewModel());
  useEffect(() => {
    void vm.load(itemId);
    return () => vm.dispose();
  }, [vm, itemId]);
  return (
    <M2ProductView vm={vm} cartCount={cartCount(cart)} navClearance={PILL_NAV_HEIGHT}
      links={{ ...links, add: (quantity) => { if (vm.item) { addToCart(cart, vm.item, quantity); links.afterAdd(); } } }} />
  );
}
