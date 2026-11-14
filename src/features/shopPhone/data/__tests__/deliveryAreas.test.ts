import { describe, expect, it, vi } from 'vitest';
import { fetchAreas, refusalKey, withArea } from '../deliveryAreas';

type Requester = typeof import('@/data/services/http').apiRequest;

describe('delivery areas', () => {
  it('reads the areas of a pincode and drops anything that is not a name', async () => {
    const request = vi.fn(async () => ({ areas: ['Bachupally', '', 7, 'Nizampet'] })) as unknown as Requester;
    expect(await fetchAreas(request, '500090')).toEqual(['Bachupally', 'Nizampet']);
    expect(request).toHaveBeenCalledWith('/pincodes/500090/areas');
  });

  it('does not ask for a pincode that is not six digits', async () => {
    const request = vi.fn() as unknown as Requester;
    expect(await fetchAreas(request, '05009')).toEqual([]);
    expect(request).not.toHaveBeenCalled();
  });

  it('treats a reply with no list as no areas', async () => {
    expect(await fetchAreas((async () => ({})) as unknown as Requester, '500090')).toEqual([]);
  });

  it('has words for each refusal the server names, and none for others', () => {
    expect(refusalKey('NO_PINCODE')).toBe('cart.refusal.noPincode');
    expect(refusalKey('AREA_NEEDED')).toBe('cart.refusal.areaNeeded');
    expect(refusalKey('NO_AREA')).toBe('cart.refusal.noArea');
    expect(refusalKey('')).toBeNull();
    expect(refusalKey(undefined)).toBeNull();
    expect(refusalKey('toString')).toBeNull();
  });

  it('adds the area only to a home delivery that has one', () => {
    const home = { mode: 'delivery' as const, pincode: '500090' };
    expect(withArea(home, 'Bachupally')).toEqual({ ...home, area: 'Bachupally' });
    expect(withArea(home, '')).toEqual(home);
    expect(withArea({ mode: 'pickup' as const, pincode: '500090' }, 'Bachupally')).toEqual({ mode: 'pickup', pincode: '500090' });
  });
});
