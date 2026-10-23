import { makeAutoObservable } from 'mobx';
import type { ViewModel } from '@/core/store/ViewModel';
import type { FabricProvider, FabricOrder } from '@/types';

export interface TestPackage {
  id: string;
  name: string;
  category: 'DIAGNOSTICS' | 'HEALTH_CHECKUP' | 'RADIOLOGY' | 'GENOMICS';
  price: number;
  originalPrice: number;
  testCount: number;
  fastingHours: number;
  tatHours: number;
  description: string;
}

export class MarketplaceViewModel implements ViewModel {
  public searchQuery = '';
  public selectedCategory: string = 'ALL';
  public selectedModality: 'ALL' | 'HOME_COLLECTION' | 'WALK_IN' = 'ALL';
  public isBooking = false;
  public activeOrder: FabricOrder | null = null;
  public successMessage = '';
  public error = '';

  /**
   * No published providers or packages yet. These lists used to ship real lab
   * brands (Metropolis, Dr Lal PathLabs, Thyrocare) as if they were contracted
   * partners, with invented prices, ratings and fulfilment rates.
   */
  public providers: FabricProvider[] = [];

  public testPackages: TestPackage[] = [];

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  public setSearchQuery(query: string): void {
    this.searchQuery = query;
  }

  public setCategory(cat: string): void {
    this.selectedCategory = cat;
  }

  public setModality(modality: 'ALL' | 'HOME_COLLECTION' | 'WALK_IN'): void {
    this.selectedModality = modality;
  }

  public get filteredPackages(): TestPackage[] {
    return this.testPackages.filter((pkg) => {
      const matchesSearch = pkg.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        pkg.description.toLowerCase().includes(this.searchQuery.toLowerCase());
      const matchesCategory = this.selectedCategory === 'ALL' || pkg.category === this.selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }

  public bookPackage(pkg: TestPackage, provider: FabricProvider): void {
    // Fail closed: there is no booking service behind this view. It used to
    // fabricate a scheduled order for an invented patient after a timeout.
    this.isBooking = false;
    this.activeOrder = null;
    this.successMessage = '';
    this.error = `Booking ${pkg.name} with ${provider.name} isn’t available yet. Nothing was booked.`;
  }

  public clearOrder(): void {
    this.activeOrder = null;
    this.successMessage = '';
  }

  public reset(): void {
    this.searchQuery = '';
    this.selectedCategory = 'ALL';
    this.selectedModality = 'ALL';
    this.activeOrder = null;
    this.successMessage = '';
    this.error = '';
  }

  public dispose(): void {
    // Cleanup if needed
  }
}
