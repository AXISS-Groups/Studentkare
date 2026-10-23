import { describe, expect, it, vi } from 'vitest';
import { recallListing } from '@/features/phoneKit/listingCache';
import { listing, pkg } from '@/features/phoneKit/__tests__/fixtures';
import { SearchViewModel } from '../SearchViewModel';

type Requester = typeof import('@/data/services/http').apiRequest;

function vmWith(routes: Record<string, unknown>) {
  const calls: string[] = [];
  const request = vi.fn(async (path: string) => {
    calls.push(path);
    const key = Object.keys(routes).find((k) => path.startsWith(k));
    const answer = key ? routes[key] : undefined;
    if (answer instanceof Error || answer === undefined) throw answer ?? new Error(`unexpected ${path}`);
    return answer;
  }) as unknown as Requester;
  const timers: (() => void)[] = [];
  const clock = { set: (fn: () => void) => { timers.push(fn); return timers.length; }, clear: () => undefined };
  return { vm: new SearchViewModel(request, clock), calls, timers };
}

const CATALOG = {
  items: [
    listing({}),
    listing({ id: 'lab-1', kind: 'lab', name: 'Vitamin B12 Test', category: 'labs' }),
    listing({ id: 'doc-1', kind: 'consultation', name: 'Nutrition consult', category: 'nutrition', pricePaise: 0 }),
    listing({ id: 'doc-2', kind: 'consultation', name: 'General physician', category: 'general-care' }),
  ],
  total: 4,
};

describe('SearchViewModel', () => {
  it('goes from entry to typing, and asks the catalogue for suggestions after the pause', async () => {
    const { vm, calls, timers } = vmWith({ '/catalog': { items: [listing({})], total: 1 } });
    expect(vm.stage).toBe('entry');
    vm.setQuery('vit');
    expect(vm.stage).toBe('typing');
    expect(calls).toHaveLength(0);
    timers[timers.length - 1]?.();
    await vi.waitFor(() => expect(vm.suggestPhase).toBe('ready'));
    expect(calls[0]).toContain('/catalog?limit=6&offset=0&query=vit');
    expect(vm.suggestions.map((s) => s.name)).toEqual(['Vitamin D3 60K']);
    vm.clear();
    expect(vm.stage).toBe('entry');
  });

  it('searches the catalogue, the bookable lab packages and the articles, and remembers the search for this screen only', async () => {
    const { vm, calls } = vmWith({
      '/catalog': CATALOG,
      '/lab-packages': { items: [pkg({}), pkg({ id: 'l2', name: 'Thyroid Profile', includes: ['TSH'], description: 'Thyroid' })] },
      '/home': { articles: [{ id: 'a1', tag: 'Nutrition', title: 'Why students run low on vitamin D', readTime: '3 min', color: '', body: ['…'] }] },
    });
    await vm.submit('vitamin');
    expect(vm.phase).toBe('ready');
    expect(calls).toEqual(expect.arrayContaining([expect.stringContaining('/catalog?limit=50&offset=0&query=vitamin'), '/lab-packages', '/home']));
    expect(vm.medicines.map((m) => m.id)).toEqual(['p1']);
    expect(vm.labs.map((l) => l.id)).toEqual(['l1']);
    expect(vm.articles).toHaveLength(1);
    expect(vm.recents).toEqual(['vitamin']);
    // A listing the shop can open without asking again.
    expect(recallListing('p1')?.name).toBe('Vitamin D3 60K');
  });

  it('says nothing was found only when every source is empty, and offers each word on its own', async () => {
    const { vm } = vmWith({ '/catalog': { items: [], total: 0 }, '/lab-packages': { items: [] }, '/home': { articles: [] } });
    await vm.submit('vitmain d3 tablt');
    expect(vm.nothingFound).toBe(true);
    expect(vm.retryWords).toEqual(['vitmain', 'tablt']);
  });

  it('fails visibly when the catalogue cannot be read (no empty list pretending to be an answer)', async () => {
    const { vm } = vmWith({ '/catalog': new Error('down'), '/lab-packages': { items: [] }, '/home': { articles: [] } });
    await vm.submit('vitamin');
    expect(vm.phase).toBe('error');
    expect(vm.nothingFound).toBe(false);
  });

  it('marks the lab tab as failed, not empty, when lab packages cannot be read', async () => {
    const { vm } = vmWith({ '/catalog': CATALOG, '/lab-packages': new Error('down'), '/home': { articles: [] } });
    await vm.submit('vitamin');
    expect(vm.phase).toBe('ready');
    expect(vm.labsFailed).toBe(true);
  });

  it('filters and sorts lab packages from their own fields', async () => {
    const { vm } = vmWith({
      '/catalog': CATALOG,
      '/lab-packages': { items: [pkg({ id: 'a', pricePaise: 90000, fastingHours: 10 }), pkg({ id: 'b', pricePaise: 30000, lab: { id: 'x', name: 'X', accreditation: '', homeCollection: false } })] },
      '/home': { articles: [] },
    });
    await vm.submit('vitamin', 'labs');
    expect(vm.tab).toBe('labs');
    expect(vm.labList.map((l) => l.id)).toEqual(['a', 'b']);
    vm.setLabSort('price');
    expect(vm.labList.map((l) => l.id)).toEqual(['b', 'a']);
    vm.toggleLabFasting();
    expect(vm.labList.map((l) => l.id)).toEqual(['b']);
    vm.toggleLabHome();
    expect(vm.labList).toEqual([]);
  });

  it('narrows doctors by the consultation category', async () => {
    const { vm } = vmWith({ '/catalog': CATALOG, '/lab-packages': { items: [] }, '/home': { articles: [] } });
    await vm.submit('consult');
    expect(vm.doctorCategories).toEqual(['nutrition', 'general-care']);
    vm.setDoctorCategory('nutrition');
    expect(vm.doctorList.map((d) => d.id)).toEqual(['doc-1']);
  });
});
