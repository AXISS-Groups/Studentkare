import { describe, expect, it, vi } from 'vitest';
import type { ContractRecord, EnterpriseInquiry } from '@/data/datasets/billing';
import type { ContractsRepository } from '../../model/contractsRepository';
import type { ContractList, InquiryList } from '../../model/types';
import { ContractsViewModel } from '../ContractsViewModel';

const inquiry: EnterpriseInquiry = { id: 'inq-1', organization: 'IIT Example', contactName: 'Asha Rao', email: 'asha@iit.example', seats: 1200, planId: 'CAMPUS', message: '', status: 'NEW', createdAt: 1790000000 };
const contract: ContractRecord = { id: 'con-1', organization: 'NIT Example', planId: 'ENTERPRISE', status: 'ACTIVE', seats: 800, assigned: [], annualAmountPaise: 0, amountPaidPaise: 0, periodStart: 1790000000, periodEnd: 1821536000, paymentReference: '' };
const settle = async () => { for (let i = 0; i < 8; i += 1) await Promise.resolve(); };

function repository(overrides: Partial<ContractsRepository> = {}): ContractsRepository {
  return {
    inquiries: vi.fn().mockResolvedValue({ items: [inquiry] }),
    contracts: vi.fn().mockResolvedValue({ items: [contract] }),
    setInquiryStatus: vi.fn().mockResolvedValue({}),
    createContract: vi.fn().mockResolvedValue({}),
    ...overrides,
  };
}

describe('ContractsViewModel', () => {
  it('is loading before the first load, then loads both lists together', async () => {
    const repo = repository();
    const vm = new ContractsViewModel(repo);
    expect(vm.loading).toBe(true);
    await vm.load();
    expect(repo.inquiries).toHaveBeenCalledWith(expect.any(AbortSignal));
    expect(repo.contracts).toHaveBeenCalledWith(expect.any(AbortSignal));
    expect(vm.inquiries).toEqual([inquiry]);
    expect(vm.contracts).toEqual([contract]);
    expect(vm.loading).toBe(false);
    expect(vm.error).toBe('');
  });

  it('fails as a whole when either list fails, keeping the lists it already had', async () => {
    const inquiries = vi.fn().mockResolvedValueOnce({ items: [inquiry] }).mockRejectedValue(new Error('Billing is unavailable'));
    const vm = new ContractsViewModel(repository({ inquiries }));
    await vm.load();
    await vm.load();
    expect(vm.error).toBe('Billing is unavailable');
    expect(vm.loading).toBe(false);
    expect(vm.inquiries).toEqual([inquiry]);
    expect(vm.contracts).toEqual([contract]);
  });

  it('keeps the current lists while reloading', async () => {
    const vm = new ContractsViewModel(repository());
    await vm.load();
    void vm.load();
    expect(vm.loading).toBe(true);
    expect(vm.inquiries).toEqual([inquiry]);
  });

  it('changes an inquiry’s status, then reloads both lists', async () => {
    const repo = repository();
    const vm = new ContractsViewModel(repo);
    await vm.load();
    expect(await vm.setInquiryStatus('inq-1', 'CONTACTED')).toBe(true);
    expect(repo.setInquiryStatus).toHaveBeenCalledWith('inq-1', 'CONTACTED');
    expect(repo.inquiries).toHaveBeenCalledTimes(2);
    expect(repo.contracts).toHaveBeenCalledTimes(2);
    expect(vm.acting).toBe(false);
  });

  it('creates a contract from the form as typed, then reloads, keeping the form', async () => {
    const repo = repository();
    const vm = new ContractsViewModel(repo);
    expect(vm.form).toEqual({ organization: '', planId: 'CAMPUS', managerEmail: '', seats: 1000, annualAmountPaise: 0, signedReference: '' });
    vm.setField('organization', 'VIT Example');
    vm.setField('planId', 'ENTERPRISE');
    vm.setField('managerEmail', 'ops@vit.example');
    vm.setField('seats', 2500);
    vm.setField('annualAmountPaise', 150000000);
    vm.setField('signedReference', 'MOU-2026-14');
    expect(await vm.createContract()).toBe(true);
    const sent = vi.mocked(repo.createContract).mock.calls[0][0];
    expect(sent).toEqual({ organization: 'VIT Example', planId: 'ENTERPRISE', managerEmail: 'ops@vit.example', seats: 2500, annualAmountPaise: 150000000, signedReference: 'MOU-2026-14' });
    expect(Object.keys(sent)).toEqual(['organization', 'planId', 'managerEmail', 'seats', 'annualAmountPaise', 'signedReference']);
    expect(repo.inquiries).toHaveBeenCalledTimes(1);
    expect(vm.form.organization).toBe('VIT Example');
  });

  it('shows a failed action, does not reload, and falls back to a generic message', async () => {
    const setInquiryStatus = vi.fn().mockRejectedValueOnce(new Error('Inquiry is closed')).mockRejectedValueOnce('nope');
    const repo = repository({ setInquiryStatus });
    const vm = new ContractsViewModel(repo);
    await vm.load();
    expect(await vm.setInquiryStatus('inq-1', 'QUALIFIED')).toBe(false);
    expect(vm.actionError).toBe('Inquiry is closed');
    expect(repo.inquiries).toHaveBeenCalledTimes(1);
    const next = vm.setInquiryStatus('inq-1', 'QUALIFIED');
    expect(vm.actionError).toBe('');
    await next;
    expect(vm.actionError).toBe('The request could not be completed.');
  });

  it('runs one action at a time across status changes and contract creation', async () => {
    let release!: () => void;
    const createContract = vi.fn(() => new Promise<unknown>(resolve => { release = () => resolve({}); }));
    const repo = repository({ createContract });
    const vm = new ContractsViewModel(repo);
    const creating = vm.createContract();
    expect(vm.acting).toBe(true);
    expect(await vm.setInquiryStatus('inq-1', 'CLOSED')).toBe(false);
    expect(repo.setInquiryStatus).not.toHaveBeenCalled();
    release();
    expect(await creating).toBe(true);
  });

  it('ignores a stale load and cancels it', async () => {
    const pending: { signal?: AbortSignal; resolve: (value: InquiryList) => void }[] = [];
    const inquiries = vi.fn((signal?: AbortSignal) => new Promise<InquiryList>(resolve => { pending.push({ signal, resolve }); }));
    const contracts = vi.fn((): Promise<ContractList> => Promise.resolve({ items: [] }));
    const vm = new ContractsViewModel(repository({ inquiries, contracts }));
    void vm.load();
    void vm.load();
    expect(pending[0].signal?.aborted).toBe(true);
    pending[1].resolve({ items: [inquiry] });
    await settle();
    pending[0].resolve({ items: [] });
    await settle();
    expect(vm.inquiries).toEqual([inquiry]);
  });

  it('changes nothing after dispose, and a later load works again', async () => {
    let release!: () => void;
    const createContract = vi.fn(() => new Promise<unknown>(resolve => { release = () => resolve({}); }));
    const repo = repository({ createContract });
    const vm = new ContractsViewModel(repo);
    await vm.load();
    const creating = vm.createContract();
    vm.dispose();
    release();
    expect(await creating).toBe(false);
    expect(repo.inquiries).toHaveBeenCalledTimes(1);
    await vm.load();
    expect(repo.inquiries).toHaveBeenCalledTimes(2);
  });
});
