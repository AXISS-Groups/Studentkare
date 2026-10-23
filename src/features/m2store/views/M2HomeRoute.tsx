import React, { useState } from 'react';
import { useAuth } from '@/data/contexts/AuthContext';
import { useOptionalLiveCart } from '@/data/contexts/LiveCartContext';
import { useNavigate } from '@/core/navigation';
import { navigate } from '@/lib/utils/workflowRouting';
import { getSetting } from '@/data/services/config';
import { usePhoneHeaderSlot } from '@/design-system/navigation/BoardHeader';
import { recentlyViewed } from '@/features/phoneKit/listingCache';
import { cannotAdd } from '@/features/shopPhone/viewmodel/PhoneShopViewModel';
import type { ShopFilter } from '../data/storeArt';
import { useM2HomeData } from '../data/useM2Home';
import { M2BlogCard, homeTeaserCount, useLatestPosts } from '@/features/newsroom/views/M2PostParts';
import { M2HomeView } from './M2HomeView';
import type { ServiceKey } from './M2HomeView';

/**
 * Mobile 2.0 Home on the web: /health for a signed-in student at phone width,
 * inside the student phone frame. Each part hands off to the route that does
 * the job today; SOS opens the frame's helplines, the avatar its More panel.
 */
/** The shop opened on a filter (`/shop?category=` or `?q=`), as ShopPhoneRoute reads it. */
export function shopPath(filter: ShopFilter): string {
  return 'category' in filter ? `/shop?category=${encodeURIComponent(filter.category)}` : `/shop?q=${encodeURIComponent(filter.query)}`;
}

const SERVICE_ROUTES = {
  medicines: 'shop', labs: 'lab-tests', consults: 'care', nearMe: 'find-care', vaccines: 'preventive-care', insurance: 'insurance', campus: 'digital-id',
} as const satisfies Record<Exclude<ServiceKey, 'you'>, string>;

export function M2HomeRoute(): React.ReactElement {
  const { user } = useAuth();
  const routerNavigate = useNavigate();
  const slot = usePhoneHeaderSlot();
  const cart = useOptionalLiveCart();
  const data = useM2HomeData();
  const [blogAttempt, setBlogAttempt] = useState(0);
  const blog = useLatestPosts('HEALTH_TIP', homeTeaserCount(), blogAttempt);
  const count = cart ? cart.lines.reduce((sum, line) => sum + line.quantity, 0) : 0;
  return (
    <M2HomeView
      name={user?.fullName ?? ''}
      campus={user?.university ?? ''}
      verified={user?.isVerifiedStudent === true}
      data={data}
      recent={recentlyViewed(getSetting('shop.home_featured_count'))}
      blog={<M2BlogCard state={blog} onOpen={(post) => routerNavigate(post.path)} onAll={() => routerNavigate('/blog')} onRetry={() => setBlogAttempt((n) => n + 1)} />}
      cart={cart ? { count, add: cart.add, canAdd: (item) => !cannotAdd(item) } : undefined}
      links={{
        sos: () => (slot?.openSos ? slot.openSos() : navigate('sos')),
        menu: slot ? slot.openMore : undefined,
        notifications: () => navigate('notifications'),
        cart: () => navigate('checkout'),
        search: () => navigate('search'),
        uploadRx: () => navigate('prescriptions'),
        place: () => navigate('profile'),
        services: {
          medicines: () => navigate(SERVICE_ROUTES.medicines),
          labs: () => navigate(SERVICE_ROUTES.labs),
          consults: () => navigate(SERVICE_ROUTES.consults),
          nearMe: () => navigate(SERVICE_ROUTES.nearMe),
          vaccines: () => navigate(SERVICE_ROUTES.vaccines),
          insurance: () => navigate(SERVICE_ROUTES.insurance),
          campus: () => navigate(SERVICE_ROUTES.campus),
        },
        labs: () => navigate('lab-tests'),
        generics: () => routerNavigate(shopPath({ category: 'medicines' })),
        uploadReport: () => navigate('records'),
        meds: () => navigate('health/medicines'),
        buyAgain: () => navigate('buy-again'),
        consult: () => navigate('appointments'),
        bookConsult: () => navigate('care'),
        concern: (filter) => routerNavigate(shopPath(filter)),
        product: (item) => routerNavigate(`/shop?product=${encodeURIComponent(item.id)}`),
        emergencyCard: () => navigate('emergency-card'),
        pass: () => navigate('pass'),
        hostelVisit: () => navigate('hostel-visit'),
        camp: () => navigate('health-camp'),
      }}
    />
  );
}
