import React from 'react';
import { observer } from 'mobx-react-lite';
import { cannotAdd } from '@/features/shopPhone/viewmodel/PhoneShopViewModel';
import type { CartPort, PhoneShopViewModel } from '@/features/shopPhone/viewmodel/PhoneShopViewModel';
import { cartCount } from '@/features/shopPhone/views/shopParts';
import type { ShopLinks } from '@/features/shopPhone/views/shopParts';
import { M2MedicinesView } from './M2MedicinesView';

/**
 * Mobile 2.0 Medicines as the phone shop's first board (ShopFlow, web and
 * Expo): the shop view model's catalogue shelf, points and lab price, its cart,
 * and its list / product / cart boards behind each tile.
 */
export const M2MedicinesBoard = observer(function M2MedicinesBoard({ vm, cart, links }: { vm: PhoneShopViewModel; cart: CartPort; links: ShopLinks }) {
  return (
    <M2MedicinesView
      cartCount={cartCount(cart)}
      shelf={{ phase: vm.homePhase, items: vm.featured, retry: () => void vm.loadHome() }}
      points={{ value: vm.points, ready: vm.homePhase === 'ready' }}
      labFromPaise={vm.labFromPaise}
      cart={{ add: cart.add, canAdd: (item) => !cannotAdd(item) }}
      links={{
        back: () => (links.exit ? links.exit() : undefined),
        cart: () => vm.push({ name: 'cart' }),
        search: (query) => vm.openList({ query }),
        rx: links.openPrescriptions,
        category: (filter) => vm.openList(filter),
        generics: () => vm.openList({ category: 'medicines' }),
        refills: links.openMyHealth ?? links.openRefill,
        product: vm.openProduct,
        seeAll: () => vm.openList({}),
        rewards: links.openRewards,
        labs: links.openLabTests,
        medicineInfo: links.openMedicineInfo ? () => links.openMedicineInfo?.() : undefined,
      }}
    />
  );
});
