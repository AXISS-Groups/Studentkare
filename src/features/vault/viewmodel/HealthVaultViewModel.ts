import { runInAction } from 'mobx';
import { AutoObservableViewModel } from '@/core/store/ViewModel';
import type { HealthRecord } from '@/types';

export interface AbdmConsentRequest {
  id: string;
  requesterName: string;
  purpose: string;
  expiryDate: string;
  dataTypes: string[];
  status: 'PENDING' | 'GRANTED' | 'DENIED';
}

export class HealthVaultViewModel extends AutoObservableViewModel {
  public abhaAddress = 'aarav.sharma@abdm';
  public abhaNumber = '91-8829-1029-4401';
  public isLinkedWithAbdm = true;
  public isSyncing = false;
  public syncMessage = '';

  public consentRequests: AbdmConsentRequest[] = [
    {
      id: 'cr-101',
      title: 'IIT Bombay Campus Health Center',
      requesterName: 'Dr. Ramesh Kumar (MO)',
      purpose: 'Annual Health Camp Passport Verification',
      expiryDate: '2026-12-31',
      dataTypes: ['Lab Records', 'Prescriptions'],
      status: 'GRANTED',
    } as any,
    {
      id: 'cr-102',
      title: 'Metropolis Healthcare Diagnostics',
      requesterName: 'Metropolis Diagnostics Lab System',
      purpose: 'Diagnostic Lab Test Ingestion',
      expiryDate: '2026-10-15',
      dataTypes: ['Diagnostic Reports'],
      status: 'PENDING',
    } as any,
  ];

  public storedRecords: HealthRecord[] = [
    {
      id: 'rec-01',
      title: 'Complete Blood Count (CBC) & Dengue NS1',
      category: 'LAB',
      date: '2026-09-10',
      facilityName: 'Metropolis Diagnostics',
      doctorName: 'Dr. S. Nair',
      sourceType: 'ABDM_PULL',
      observations: [
        { id: 'obs-1', code: '58410-2', display: 'Platelet Count', value: 210000, unit: '/µL', isAbnormal: false, confidenceScore: 98 },
        { id: 'obs-2', code: '718-7', display: 'Hemoglobin', value: 14.5, unit: 'g/dL', isAbnormal: false, confidenceScore: 99 },
      ],
      confidenceGatePassed: true,
      humanReviewRequired: false,
      isCachedOffline: true,
      syncStatus: 'SYNCED',
    },
    {
      id: 'rec-02',
      title: 'Outpatient Consultation & Rx',
      category: 'PRESCRIPTION',
      date: '2026-08-28',
      facilityName: 'Campus Health Centre',
      doctorName: 'Dr. Radhika Sen',
      sourceType: 'SCAN',
      observations: [],
      confidenceGatePassed: true,
      humanReviewRequired: false,
      isCachedOffline: true,
      syncStatus: 'SYNCED',
    },
  ];

  constructor() {
    super();
  }

  public syncAbdmRecords(): void {
    this.isSyncing = true;
    this.syncMessage = 'Connecting to ABDM Gateway & pulls FHIR bundles...';

    setTimeout(() => {
      runInAction(() => {
        this.isSyncing = false;
        this.syncMessage = 'Vault successfully synced with ABDM Health Repository (2 new records found).';
      });
    }, 1200);
  }

  public grantConsent(requestId: string): void {
    const req = this.consentRequests.find((r) => r.id === requestId);
    if (req) {
      req.status = 'GRANTED';
    }
  }

  public denyConsent(requestId: string): void {
    const req = this.consentRequests.find((r) => r.id === requestId);
    if (req) {
      req.status = 'DENIED';
    }
  }

  public override reset(): void {
    this.isSyncing = false;
    this.syncMessage = '';
  }

  public override dispose(): void {
    // Cleanup if needed
  }
}
