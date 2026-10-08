import { describe, expect, it, vi } from 'vitest';
import type { LiveCatalogItem, StaffAccount } from '@/data/workflowTypes';
import type { AccountsRepository } from '../../model/accountsRepository';
import type { CatalogueRepository } from '../../model/catalogueRepository';
import type { CatalogListQuery, CatalogPage } from '../../model/types';
import { CatalogueViewModel } from '../CatalogueViewModel';

const item = (id: string, overrides: Partial<LiveCatalogItem> = {}): LiveCatalogItem => ({ id, providerId: 'p', kind: 'product', name: id, brand: '', category: 'devices', description: '', pack: '', pricePaise: 100, mrpPaise: 100, stock: 5, active: true, requiresPrescription: false, preparation: '', ...overrides });
const staff = (id: string, role: StaffAccount['role'], active = true): StaffAccount => ({ id, fullName: id, identifier: id, role, active });
const settle = async () => { for (let i = 0; i < 8; i += 1) await Promise.resolve(); };

function catalogue(overrides: Partial<CatalogueRepository> = {}): CatalogueRepository {
  return {
    sample: vi.fn().mockResolvedValue({ items: [item('a', { stock: 3 }), item('b', { stock: 0 }), item('c', { kind: 'lab', stock: 0 })], total: 250 }),
    list: vi.fn().mockResolvedValue({ items: [item('a')], total: 40 }),
    create: vi.fn().mockResolvedValue(item('new')),
    update: vi.fn().mockResolvedValue({}),
    uploadImage: vi.fn().mockResolvedValue({}),
    removeImage: vi.fn().mockResolvedValue({}),
    ...overrides,
  };
}
function accounts(overrides: Partial<AccountsRepository> = {}): AccountsRepository {
  return {
    countByRole: vi.fn(), list: vi.fn(), create: vi.fn(), setCampus: vi.fn(),
    listAll: vi.fn().mockResolvedValue({ items: [staff('v1', 'VENDOR'), staff('v2', 'VENDOR', false), staff('d1', 'NMC_DOCTOR'), staff('s1', 'STUDENT')] }),
    ...overrides,
  };
}
const loaded = async (catalogueRepo = catalogue(), accountsRepo = accounts()) => {
  const vm = new CatalogueViewModel(catalogueRepo, accountsRepo);
  vm.load();
  await settle();
  return vm;
};

describe('CatalogueViewModel loading', () => {
  it('is loading before the first load, then loads the summary, the first page and the accounts, in that order', async () => {
    const calls: string[] = [];
    const catalogueRepo = catalogue({
      sample: vi.fn(async (limit: number) => { calls.push(`sample ${limit}`); return { items: [], total: 0 }; }),
      list: vi.fn(async (query: CatalogListQuery) => { calls.push(`list ${JSON.stringify(query)}`); return { items: [], total: 0 }; }),
    });
    const accountsRepo = accounts({ listAll: vi.fn(async () => { calls.push('accounts'); return { items: [] }; }) });
    const vm = new CatalogueViewModel(catalogueRepo, accountsRepo);
    expect(vm.summaryLoading).toBe(true);
    expect(vm.listLoading).toBe(true);
    vm.load();
    expect(calls).toEqual(['sample 200', 'list {"limit":15,"offset":0,"query":""}', 'accounts']);
    await settle();
    expect(vm.summaryLoading).toBe(false);
    expect(vm.listLoading).toBe(false);
  });

  it('summarises products, other services and products out of stock, and notes a partial sample', async () => {
    const vm = await loaded();
    expect([vm.summary?.total, vm.productCount, vm.serviceCount, vm.outOfStockCount]).toEqual([250, 2, 1, 1]);
    expect(vm.summaryIsPartial).toBe(true);
    expect(vm.sampled).toHaveLength(3);
  });

  it('keeps summary, list and accounts errors separate, and reloads each on its own', async () => {
    const catalogueRepo = catalogue({ sample: vi.fn().mockRejectedValueOnce(new Error('Summary timed out')).mockResolvedValue({ items: [], total: 0 }), list: vi.fn().mockRejectedValueOnce(new Error('List timed out')).mockResolvedValue({ items: [item('a')], total: 1 }) });
    const vm = await loaded(catalogueRepo, accounts({ listAll: vi.fn().mockRejectedValue(new Error('Accounts unavailable')) }));
    expect([vm.summaryError, vm.listError, vm.accountsError]).toEqual(['Summary timed out', 'List timed out', 'Accounts unavailable']);
    vm.reloadList();
    await settle();
    expect(vm.listError).toBe('');
    expect(vm.items.map(entry => entry.id)).toEqual(['a']);
    expect(vm.summaryError).toBe('Summary timed out');
    expect(catalogueRepo.sample).toHaveBeenCalledTimes(1);
  });

  it('searches from the first page and pages by 15, without reloading an unchanged query', async () => {
    const catalogueRepo = catalogue();
    const vm = await loaded(catalogueRepo);
    expect(vm.total).toBe(40);
    vm.setPage(1);
    vm.setQuery('blood test');
    vm.setPage(0);
    expect(vi.mocked(catalogueRepo.list).mock.calls.map(([query]) => query)).toEqual([
      { limit: 15, offset: 0, query: '' },
      { limit: 15, offset: 15, query: '' },
      { limit: 15, offset: 0, query: 'blood test' },
    ]);
    // The list is cleared while a new page loads.
    expect(vm.total).toBe(0);
    expect(vm.listLoading).toBe(true);
  });
});

describe('CatalogueViewModel publish form', () => {
  it('offers active providers of the role the entry type needs, and clears the provider when the type changes', async () => {
    const vm = await loaded();
    expect(vm.providers.map(account => account.id)).toEqual(['v1']);
    vm.setField('providerId', 'v1');
    vm.setKind('consultation');
    expect(vm.providers.map(account => account.id)).toEqual(['d1']);
    expect(vm.form.providerId).toBe('');
    vm.setKind('lab');
    expect(vm.providers.map(account => account.id)).toEqual(['v1']);
  });

  it('has no providers while the accounts are missing', () => {
    const vm = new CatalogueViewModel(catalogue(), accounts());
    expect(vm.providers).toEqual([]);
  });

  it('publishes the form with stock as a number and the price in paise, in the original key order, then uploads the photo', async () => {
    const catalogueRepo = catalogue();
    const vm = await loaded(catalogueRepo);
    vm.setField('name', 'Pulse oximeter');
    vm.setField('brand', 'Dr Trust');
    vm.setField('providerId', 'v1');
    vm.setField('pack', '1 device');
    vm.setField('price', '1299.50');
    vm.setField('stock', '30');
    vm.setField('description', 'Clip-on fingertip pulse oximeter.');
    vm.setField('requiresPrescription', true);
    const photo = new Blob(['png']);
    expect(await vm.publish(photo)).toBe(true);
    const sent = vi.mocked(catalogueRepo.create).mock.calls[0][0];
    expect(sent).toEqual({ name: 'Pulse oximeter', brand: 'Dr Trust', kind: 'product', category: 'devices', description: 'Clip-on fingertip pulse oximeter.', pack: '1 device', stock: 30, providerId: 'v1', preparation: '', requiresPrescription: true, pricePaise: 129950 });
    expect(Object.keys(sent)).toEqual(['name', 'brand', 'kind', 'category', 'description', 'pack', 'stock', 'providerId', 'preparation', 'requiresPrescription', 'pricePaise']);
    expect(catalogueRepo.uploadImage).toHaveBeenCalledWith('new', photo);
    expect(vm.form.name).toBe('');
    expect(catalogueRepo.list).toHaveBeenCalledTimes(2);
    expect(catalogueRepo.sample).toHaveBeenCalledTimes(1);
  });

  it('sends an empty stock as 0 and skips the upload without a photo', async () => {
    const catalogueRepo = catalogue();
    const vm = await loaded(catalogueRepo);
    vm.setField('price', '10');
    expect(await vm.publish(null)).toBe(true);
    expect(vi.mocked(catalogueRepo.create).mock.calls[0][0]).toMatchObject({ stock: 0, pricePaise: 1000 });
    expect(catalogueRepo.uploadImage).not.toHaveBeenCalled();
  });

  it('keeps the form and shows the error when publishing or its photo upload fails', async () => {
    const catalogueRepo = catalogue({ uploadImage: vi.fn().mockRejectedValue(new Error('Image too large')) });
    const vm = await loaded(catalogueRepo);
    vm.setField('name', 'Pulse oximeter');
    expect(await vm.publish(new Blob(['x']))).toBe(false);
    expect(vm.actionError).toBe('Image too large');
    expect(vm.form.name).toBe('Pulse oximeter');
    expect(catalogueRepo.list).toHaveBeenCalledTimes(1);
  });
});

describe('CatalogueViewModel entry changes', () => {
  it('shows the stock edit, and allows saving only whole numbers', async () => {
    const vm = await loaded();
    const entry = item('a', { stock: 12 });
    expect(vm.stockText(entry)).toBe('12');
    vm.editStock('a', '25');
    expect(vm.stockText(entry)).toBe('25');
    expect(vm.canSaveStock(entry)).toBe(true);
    vm.editStock('a', '2.5');
    expect(vm.canSaveStock(entry)).toBe(false);
    vm.editStock('a', '');
    expect(vm.canSaveStock(entry)).toBe(false);
  });

  it('saves stock with the current publication, reloads, and keeps the edit', async () => {
    const catalogueRepo = catalogue();
    const vm = await loaded(catalogueRepo);
    vm.editStock('a', '25');
    expect(await vm.saveStock(item('a', { active: false }))).toBe(true);
    expect(catalogueRepo.update).toHaveBeenCalledWith('a', { stock: 25, active: false });
    expect(Object.keys(vi.mocked(catalogueRepo.update).mock.calls[0][1])).toEqual(['stock', 'active']);
    expect(catalogueRepo.list).toHaveBeenCalledTimes(2);
    expect(vm.stockText(item('a'))).toBe('25');
  });

  it('hides or publishes with the stock the server reports', async () => {
    const catalogueRepo = catalogue();
    const vm = await loaded(catalogueRepo);
    vm.editStock('a', '99');
    await vm.togglePublished(item('a', { stock: 7, active: true }));
    expect(catalogueRepo.update).toHaveBeenCalledWith('a', { stock: 7, active: false });
  });

  it('shows a failed change with its message or a generic one, cleared on the next attempt, without reloading', async () => {
    const update = vi.fn().mockRejectedValueOnce(new Error('Stock cannot be negative')).mockRejectedValueOnce('nope');
    const catalogueRepo = catalogue({ update });
    const vm = await loaded(catalogueRepo);
    expect(await vm.saveStock(item('a'))).toBe(false);
    expect(vm.actionError).toBe('Stock cannot be negative');
    const next = vm.togglePublished(item('a'));
    expect(vm.actionError).toBe('');
    await next;
    expect(vm.actionError).toBe('The request could not be completed.');
    expect(catalogueRepo.list).toHaveBeenCalledTimes(1);
  });

  it('runs one entry change at a time, while photo changes keep their own lock', async () => {
    let release!: () => void;
    const update = vi.fn(() => new Promise<unknown>(resolve => { release = () => resolve({}); }));
    const catalogueRepo = catalogue({ update });
    const vm = await loaded(catalogueRepo);
    const saving = vm.saveStock(item('a'));
    expect(vm.saving).toBe(true);
    expect(await vm.togglePublished(item('b'))).toBe(false);
    expect(await vm.publish(null)).toBe(false);
    expect(update).toHaveBeenCalledTimes(1);
    expect(catalogueRepo.create).not.toHaveBeenCalled();
    expect(await vm.removeImage('b')).toBe(true);
    release();
    expect(await saving).toBe(true);
  });
});

describe('CatalogueViewModel photos', () => {
  it('uploads and removes a photo, reloading after each', async () => {
    const catalogueRepo = catalogue();
    const vm = await loaded(catalogueRepo);
    const photo = new Blob(['png']);
    expect(await vm.uploadImage('a', photo)).toBe(true);
    expect(catalogueRepo.uploadImage).toHaveBeenCalledWith('a', photo);
    expect(await vm.removeImage('a')).toBe(true);
    expect(catalogueRepo.removeImage).toHaveBeenCalledWith('a');
    expect(catalogueRepo.list).toHaveBeenCalledTimes(3);
  });

  it('shows a failed photo change in its own error, without reloading', async () => {
    const catalogueRepo = catalogue({ removeImage: vi.fn().mockRejectedValue(new Error('Photo already removed')) });
    const vm = await loaded(catalogueRepo);
    expect(await vm.removeImage('a')).toBe(false);
    expect(vm.imageError).toBe('Photo already removed');
    expect(vm.actionError).toBe('');
    expect(catalogueRepo.list).toHaveBeenCalledTimes(1);
  });

  it('runs one photo change at a time', async () => {
    let release!: () => void;
    const removeImage = vi.fn(() => new Promise<unknown>(resolve => { release = () => resolve({}); }));
    const vm = await loaded(catalogue({ removeImage }));
    const removing = vm.removeImage('a');
    expect(vm.imageBusy).toBe(true);
    expect(await vm.removeImage('b')).toBe(false);
    expect(await vm.uploadImage('b', new Blob(['x']))).toBe(false);
    expect(removeImage).toHaveBeenCalledTimes(1);
    release();
    expect(await removing).toBe(true);
  });
});

describe('CatalogueViewModel cancellation', () => {
  it('ignores a stale page and cancels its request', async () => {
    const pending: { query: CatalogListQuery; signal?: AbortSignal; resolve: (value: CatalogPage) => void }[] = [];
    const list = vi.fn((query: CatalogListQuery, signal?: AbortSignal) => new Promise<CatalogPage>(resolve => { pending.push({ query, signal, resolve }); }));
    const vm = new CatalogueViewModel(catalogue({ list }), accounts());
    vm.load();
    vm.setQuery('a');
    expect(pending[0].signal?.aborted).toBe(true);
    pending[1].resolve({ items: [item('searched')], total: 1 });
    await settle();
    pending[0].resolve({ items: [item('first')], total: 1 });
    await settle();
    expect(vm.items.map(entry => entry.id)).toEqual(['searched']);
  });

  it('changes nothing after dispose, and a later load works again', async () => {
    let releaseUpdate!: () => void;
    const update = vi.fn(() => new Promise<unknown>(resolve => { releaseUpdate = () => resolve({}); }));
    const pending: { signal?: AbortSignal; resolve: (value: CatalogPage) => void }[] = [];
    const sample = vi.fn((_limit: number, signal?: AbortSignal) => new Promise<CatalogPage>(resolve => { pending.push({ signal, resolve }); }));
    const catalogueRepo = catalogue({ update, sample });
    const vm = new CatalogueViewModel(catalogueRepo, accounts());
    vm.load();
    await settle();
    const saving = vm.saveStock(item('a'));
    vm.dispose();
    expect(pending[0].signal?.aborted).toBe(true);
    pending[0].resolve({ items: [item('late')], total: 1 });
    releaseUpdate();
    expect(await saving).toBe(false);
    await settle();
    expect(vm.summary).toBeNull();
    expect(vm.saving).toBe(true);
    expect(catalogueRepo.list).toHaveBeenCalledTimes(1);
    vm.load();
    expect(sample).toHaveBeenCalledTimes(2);
    expect(catalogueRepo.list).toHaveBeenCalledTimes(2);
  });
});
