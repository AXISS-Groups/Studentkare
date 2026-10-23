import type { LiveCatalogItem, LiveOrder } from '@/data/types/workflowTypes';
import type { LabPackage } from '@/features/labBooking/data/LabBookingRepository';

/** Test fixtures for the phone boards (sample listings, never shipped). */
export const listing = (over: Partial<LiveCatalogItem>): LiveCatalogItem => ({
  id: 'p1', providerId: 'v1', kind: 'product', name: 'Vitamin D3 60K', brand: 'Sun', category: 'vitamins', description: 'A vitamin.',
  pack: '4 sachets', pricePaise: 14900, mrpPaise: 24900, stock: 5, active: true, requiresPrescription: false, preparation: '', ...over,
});

export const pkg = (over: Partial<LabPackage>): LabPackage => ({
  id: 'l1', name: 'Vitamin D Test', pack: '1 test', description: 'Blood test', pricePaise: 49900, mrpPaise: 119900, includes: ['25-OH Vitamin D'],
  fastingHours: 0, reportHours: 24, preparation: '', lab: { id: 'lab1', name: 'Demo Lab', accreditation: 'NABL', homeCollection: true }, ...over,
});

export const order = (over: Partial<LiveOrder>): LiveOrder => ({
  id: 'ord12345abcdef', createdAt: 1_760_000_000, totalPaise: 57800, delivery: { mode: 'pickup', address: '', city: 'Hyderabad', pincode: '500090' },
  requestedSlot: '', paymentStatus: 'PAID',
  lines: [{ id: 'ln1', itemId: 'p1', name: 'Vitamin D3 60K', kind: 'product', quantity: 1, pricePaise: 14900, status: 'REQUESTED' }],
  ...over,
});

type Requester = typeof import('@/data/services/http').apiRequest;

/** A request function that answers by path prefix ("METHOD path" or "path"); anything unlisted rejects. */
export function fakeRequest(routes: Record<string, unknown>) {
  const calls: { path: string; init?: RequestInit }[] = [];
  const request = (async (path: string, init?: RequestInit) => {
    calls.push({ path, init });
    const method = init?.method ?? 'GET';
    const key = Object.keys(routes).sort((a, b) => b.length - a.length)
      .find((k) => (k.includes(' ') ? `${method} ${path}`.startsWith(k) : method === 'GET' && path.startsWith(k)));
    const answer = key ? routes[key] : undefined;
    if (typeof answer === 'function') return (answer as (p: string, i?: RequestInit) => unknown)(path, init);
    if (answer instanceof Error || answer === undefined) throw answer ?? new Error(`unexpected ${method} ${path}`);
    return answer;
  }) as unknown as Requester;
  return { request, calls };
}
