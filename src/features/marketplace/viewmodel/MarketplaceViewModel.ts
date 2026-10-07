import { makeAutoObservable, runInAction } from 'mobx';
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

  public providers: FabricProvider[] = [
    {
      id: 'prov-1',
      name: 'Metropolis Healthcare Campus Hub',
      type: 'LAB',
      accreditation: 'NABL',
      accreditationExpiry: '2027-12-31',
      isAccreditationValid: true,
      coveredPincodes: ['400076', '400077'],
      modalities: ['HOME_COLLECTION', 'WALK_IN'],
      slaTatHours: 12,
      fulfilmentRate: 98.4,
      qualityScore: 4.9,
      activeContractRateDiscount: 20,
      status: 'ACTIVE',
    },
    {
      id: 'prov-2',
      name: 'Dr. Lal PathLabs Student Centre',
      type: 'LAB',
      accreditation: 'NABL',
      accreditationExpiry: '2028-06-30',
      isAccreditationValid: true,
      coveredPincodes: ['400076'],
      modalities: ['HOME_COLLECTION', 'WALK_IN'],
      slaTatHours: 18,
      fulfilmentRate: 96.8,
      qualityScore: 4.8,
      activeContractRateDiscount: 15,
      status: 'ACTIVE',
    },
    {
      id: 'prov-3',
      name: 'Thyrocare Technologies Direct',
      type: 'LAB',
      accreditation: 'ISO_15189',
      accreditationExpiry: '2026-11-15',
      isAccreditationValid: true,
      coveredPincodes: ['400076', '400078'],
      modalities: ['HOME_COLLECTION'],
      slaTatHours: 24,
      fulfilmentRate: 95.2,
      qualityScore: 4.7,
      activeContractRateDiscount: 25,
      status: 'ACTIVE',
    },
  ];

  public testPackages: TestPackage[] = [
    {
      id: 'pkg-1',
      name: 'Comprehensive Student Wellness Panel (78 Parameters)',
      category: 'HEALTH_CHECKUP',
      price: 999,
      originalPrice: 2499,
      testCount: 78,
      fastingHours: 10,
      tatHours: 12,
      description: 'Complete Blood Count (CBC), Lipid Profile, Liver Function (LFT), Kidney Function (KFT), Fasting Blood Sugar, Vitamin D3 & B12.',
    },
    {
      id: 'pkg-2',
      name: 'Executive Thyroid & Vitamin Screening',
      category: 'DIAGNOSTICS',
      price: 599,
      originalPrice: 1299,
      testCount: 8,
      fastingHours: 0,
      tatHours: 8,
      description: 'TSH, Total T3, Total T4, Serum Vitamin D25-OH, Vitamin B12, Calcium.',
    },
    {
      id: 'pkg-3',
      name: 'Dengue & Typhoid Fever Profile',
      category: 'DIAGNOSTICS',
      price: 799,
      originalPrice: 1500,
      testCount: 12,
      fastingHours: 0,
      tatHours: 4,
      description: 'Dengue NS1 Antigen, IgG/IgM Antibodies, Widal Test, CBC with Platelet Count, Urine Routine.',
    },
  ];

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
    this.isBooking = true;
    this.error = '';

    setTimeout(() => {
      runInAction(() => {
        this.activeOrder = {
          id: `ORD-FAB-${Date.now().toString().slice(-6)}`,
          partnerId: provider.id,
          partnerName: provider.name,
          serviceCategory: 'DIAGNOSTICS',
          serviceCodeLoinc: 'LNC-883-9',
          serviceName: pkg.name,
          pincode: '400076',
          modality: 'HOME_COLLECTION',
          assignedProviderId: provider.id,
          assignedProviderName: provider.name,
          state: 'scheduled',
          stateHistory: [
            { state: 'created', timestamp: new Date().toISOString(), note: 'Order placed via Studentkare Marketplace' },
            { state: 'scheduled', timestamp: new Date().toISOString(), note: 'Phlebotomist assigned for home sample collection' },
          ],
          patientId: 'STU-99201',
          patientName: 'Aarav Sharma',
          providerCost: pkg.price * 0.8,
          partnerPrice: pkg.price,
          settlementStatus: 'UNBILLED',
          createdAt: new Date().toISOString(),
        };
        this.isBooking = false;
        this.successMessage = `Order #${this.activeOrder.id} successfully booked with ${provider.name}!`;
      });
    }, 1000);
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
