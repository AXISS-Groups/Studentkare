import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { M2HomeView } from '@/features/m2store/views/M2HomeView';
import type { SearchFlow } from '@/features/discover/views/SearchFlow';
import type { M2OrdersView } from '@/features/m2store/views/M2OrdersView';
import type { LiveCatalogItem } from '@/data/types/workflowTypes';

const product: LiveCatalogItem = { id: 'product-a', providerId: 'seller-a', kind: 'product', name: 'Test product', brand: '', category: 'vitamins', description: '', pack: '', pricePaise: 100, mrpPaise: 100, stock: 1, active: true, requiresPrescription: false, preparation: '' };

const nav = vi.hoisted(() => ({ navigate: vi.fn(), web: vi.fn(), params: undefined as { orderId?: unknown } | undefined, setParams: vi.fn() }));
vi.mock('../navigation', () => ({ useNavigate: () => nav.navigate }));
vi.mock('../webActions', () => ({ useNativeWebAction: () => nav.web }));
vi.mock('react-native-safe-area-context', () => ({ SafeAreaView: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock('@react-navigation/native', () => ({
  useIsFocused: () => true,
  useRoute: () => ({ params: nav.params }),
  useNavigation: () => ({ setParams: nav.setParams, canGoBack: () => true, goBack: vi.fn() }),
}));
vi.mock('../session', () => ({ useNativeSession: () => ({ user: { id: 'adult-a', fullName: 'Test Adult', role: 'STUDENT' }, signOut: vi.fn() }) }));
vi.mock('../phoneArt', () => ({ nativePhoneArt: {} }));
vi.mock('@/features/m2store/data/useM2Home', () => ({ useM2HomeData: () => ({}) }));
vi.mock('@/features/m2store/views/M2HomeView', () => ({ M2HomeView: ({ links }: React.ComponentProps<typeof M2HomeView>) => <>
  <button onClick={links.emergencyCard}>Home card</button><button onClick={links.pass}>Home pass</button>
  <button onClick={links.sos}>SOS</button>
  <button onClick={() => links.product(product)}>Home product</button>
</> }));
vi.mock('@/features/discover/views/SearchFlow', () => ({ SearchFlow: ({ links }: React.ComponentProps<typeof SearchFlow>) => <>
  <button onClick={links.openPass}>Search pass</button><button onClick={links.openEmergencyCard}>Search card</button>
  <button onClick={() => links.openList({ category: 'vitamins', query: 'test query' })}>Filtered list</button>
  <button onClick={() => links.bookLab('lab-a')}>Selected lab</button>
  <button onClick={() => links.openProduct(product)}>Selected product</button>
  <button onClick={() => links.bookDoctor({ ...product, kind: 'consultation' })}>Selected doctor</button>
</> }));
vi.mock('@/features/m2store/views/M2OrdersView', () => ({ M2OrdersView: ({ links, focusId }: React.ComponentProps<typeof M2OrdersView>) => <>
  <output data-testid="focus">{focusId ?? 'list'}</output>
  <button onClick={links.openPass}>Orders pass</button><button onClick={links.allOrders}>All orders</button>
  <button onClick={() => links.details('order-c')}>Details</button>
</> }));
vi.mock('@/features/orders/viewmodel/OrdersViewModel', () => ({ OrdersViewModel: class { load = vi.fn(); dispose = vi.fn(); } }));

import { StudentHomeScreen } from '../StudentHomeScreen';
import { SearchScreen } from '../PhoneBoardsScreens';
import { OrdersScreen } from '../M2StoreScreens';

beforeEach(() => { vi.clearAllMocks(); nav.params = undefined; });
describe('rendered native navigation adapters', () => {
  it('Home opens the named card and pass while retaining direct SOS', () => {
    render(<StudentHomeScreen />);
    fireEvent.click(screen.getByRole('button', { name: 'Home card' }));
    fireEvent.click(screen.getByRole('button', { name: 'Home pass' }));
    fireEvent.click(screen.getByRole('button', { name: 'SOS' }));
    expect(nav.navigate.mock.calls).toEqual([['EmergencyCard'], ['Pass'], ['Emergency']]);
    fireEvent.click(screen.getByRole('button', { name: 'Home product' }));
    expect(nav.navigate).toHaveBeenLastCalledWith('Product', { itemId: 'product-a' });
  });
  it('Search retains selected lab and list context and uses the pass route', () => {
    render(<SearchScreen />);
    for (const name of ['Search pass', 'Search card', 'Filtered list', 'Selected lab']) fireEvent.click(screen.getByRole('button', { name }));
    expect(nav.navigate.mock.calls).toEqual([
      ['Pass'], ['EmergencyCard'], ['Marketplace', { category: 'vitamins', query: 'test query' }], ['Marketplace', { labItemId: 'lab-a' }],
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'Selected product' }));
    expect(nav.navigate).toHaveBeenLastCalledWith('Product', { itemId: 'product-a' });
    fireEvent.click(screen.getByRole('button', { name: 'Selected doctor' }));
    expect(nav.web).toHaveBeenCalledWith('consultation');
  });
  it('a retained Orders screen follows A → B → list and writes details/list selection to the route', () => {
    nav.params = { orderId: 'order-a' };
    const view = render(<OrdersScreen />);
    expect(screen.getByTestId('focus')).toHaveTextContent('order-a');
    nav.params = { orderId: 'order-b' };
    view.rerender(<OrdersScreen />);
    expect(screen.getByTestId('focus')).toHaveTextContent('order-b');
    fireEvent.click(screen.getByRole('button', { name: 'Details' }));
    fireEvent.click(screen.getByRole('button', { name: 'All orders' }));
    expect(nav.setParams.mock.calls).toEqual([[{ orderId: 'order-c' }], [{ orderId: undefined }]]);
    nav.params = undefined;
    view.rerender(<OrdersScreen />);
    expect(screen.getByTestId('focus')).toHaveTextContent('list');
    fireEvent.click(screen.getByRole('button', { name: 'Orders pass' }));
    expect(nav.navigate).toHaveBeenCalledWith('Pass');
  });
  it('rejects malformed Orders focus instead of rendering an arbitrary value', () => {
    nav.params = { orderId: { token: 'synthetic' } };
    render(<OrdersScreen />);
    expect(screen.getByTestId('focus')).toHaveTextContent('list');
  });
});
