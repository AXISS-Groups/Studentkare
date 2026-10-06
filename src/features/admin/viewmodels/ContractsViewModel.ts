import { makeAutoObservable, observableRef, runInAction } from 'mobx';
import type { ContractRecord, EnterpriseInquiry } from '@/data/datasets/billing';
import type { ContractsRepository } from '../model/contractsRepository';
import type { NewContract } from '../model/types';

const EMPTY_CONTRACT: NewContract = { organization: '', planId: 'CAMPUS', managerEmail: '', seats: 1000, annualAmountPaise: 0, signedReference: '' };

/**
 * Inquiries & contracts. Both lists load together and fail together, as the panel
 * this replaced did with Promise.all; a reload keeps the lists it already has until
 * the new ones arrive. Changing an inquiry's status and creating a contract share one
 * action state, as they shared one useMutation: one at a time, the error kept until
 * the next attempt, and a reload of both lists after each success. The contract form
 * keeps what was typed after a contract is created.
 */
export class ContractsViewModel {
  inquiries: EnterpriseInquiry[] = [];
  contracts: ContractRecord[] = [];
  // True before the first load, so the first render shows loading rather than empty lists.
  loading = true;
  error = '';
  form: NewContract = { ...EMPTY_CONTRACT };
  acting = false;
  actionError = '';
  private version = 0;
  private controller: AbortController | null = null;
  // Bumped on dispose only, so an action finishing after the screen has gone changes nothing.
  private generation = 0;

  constructor(private readonly repository: ContractsRepository) {
    makeAutoObservable<this, 'repository' | 'version' | 'controller' | 'generation'>(
      this,
      { repository: false, version: false, controller: false, generation: false, inquiries: observableRef, contracts: observableRef },
      { autoBind: true },
    );
  }

  setField<K extends keyof NewContract>(key: K, value: NewContract[K]) { this.form = { ...this.form, [key]: value }; }

  /** Moves an inquiry to another status, then reloads both lists. */
  setInquiryStatus(inquiryId: string, status: string) {
    return this.act(() => this.repository.setInquiryStatus(inquiryId, status));
  }

  /** Records a contract from the form. True when it was created and the screen is still open. */
  createContract() {
    const contract = { ...this.form };
    return this.act(() => this.repository.createContract(contract));
  }

  /** Runs one action at a time; on success both lists reload. */
  private async act(task: () => Promise<unknown>): Promise<boolean> {
    if (this.acting) return false;
    const generation = this.generation;
    this.acting = true;
    this.actionError = '';
    try {
      await task();
      if (generation !== this.generation) return false;
      void this.load();
      return true;
    } catch (reason) {
      if (generation === this.generation) runInAction(() => { this.actionError = reason instanceof Error ? reason.message : 'The request could not be completed.'; });
      return false;
    } finally {
      if (generation === this.generation) runInAction(() => { this.acting = false; });
    }
  }

  async load() {
    const version = ++this.version;
    this.controller?.abort();
    const controller = new AbortController();
    this.controller = controller;
    this.loading = true;
    this.error = '';
    try {
      const [inquiries, contracts] = await Promise.all([this.repository.inquiries(controller.signal), this.repository.contracts(controller.signal)]);
      if (version === this.version) runInAction(() => { this.inquiries = inquiries.items; this.contracts = contracts.items; });
    } catch (reason) {
      if (version === this.version) runInAction(() => { this.error = reason instanceof Error ? reason.message : ''; });
    } finally {
      if (version === this.version) runInAction(() => { this.loading = false; });
    }
  }

  /** Stops the lists in flight and ignores late answers. A later load works again. */
  dispose() {
    this.version += 1;
    this.generation += 1;
    this.controller?.abort();
    this.controller = null;
  }
}
