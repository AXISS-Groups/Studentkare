import { describe, expect, it, vi } from 'vitest';
import { VaccineDirectoryViewModel } from './VaccineDirectoryViewModel';
import type { Page, VaccineOffering } from './models';

const page = (id: string): Page<VaccineOffering> => ({ items: [{ id } as VaccineOffering], offset: 0, limit: 12, total: 1 });

describe('vaccine directory patient flows', () => {
  it('validates pincode without sending an invalid request and binds callbacks', async () => {
    const list = vi.fn().mockResolvedValue(page('one'));
    const vm = new VaccineDirectoryViewModel(list);
    const { setPincode, search } = vm;
    setPincode('123');
    await search();
    expect(list).not.toHaveBeenCalled();
    expect(vm.error).toContain('six-digit');
    setPincode('500001');
    await search();
    expect(vm.items[0].id).toBe('one');
  });

  it('does not replace current search with a stale response', async () => {
    let oldResult!: (result: Page<VaccineOffering>) => void;
    const list = vi.fn().mockImplementationOnce(() => new Promise(resolve => { oldResult = resolve; })).mockResolvedValue(page('new'));
    const vm = new VaccineDirectoryViewModel(list);
    const pending = vm.search();
    vm.setQuery('influenza');
    await vm.search();
    oldResult(page('old'));
    await pending;
    expect(vm.items[0].id).toBe('new');
  });

  it('clears stale listings on failure and never invents provider data', async () => {
    const list = vi.fn().mockResolvedValueOnce(page('old')).mockRejectedValue(new Error('Unavailable'));
    const vm = new VaccineDirectoryViewModel(list);
    await vm.search();
    await vm.search();
    expect(vm.items).toEqual([]);
    expect(vm.error).toBe('Unavailable');
    expect(vm.loading).toBe(false);
  });

  it('invalidates inflight responses on disposal and allows remount', async () => {
    let resolve!: (result: Page<VaccineOffering>) => void;
    const list = vi.fn().mockImplementationOnce(() => new Promise(r => { resolve = r; })).mockResolvedValue(page('fresh'));
    const vm = new VaccineDirectoryViewModel(list);
    const pending = vm.search();
    vm.dispose();
    resolve(page('stale'));
    await pending;
    expect(vm.items).toEqual([]);
    await vm.search();
    expect(vm.items[0].id).toBe('fresh');
  });
});
