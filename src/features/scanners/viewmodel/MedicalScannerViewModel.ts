import { makeAutoObservable, runInAction } from 'mobx';
import { apiRequest } from '@/data/http';
import type { ViewModel } from '@/core/store/ViewModel';

export type ScannerTab = 'MEDICATION_SEARCH' | 'XRAY_DIAGNOSTICS';

export interface ScannedMedicationItem {
  brandName: string;
  activeMolecule: string;
  dosage: string;
  purpose: string;
  matchedCatalogId?: string;
  pricePaise?: number;
}

export interface DiagnosticAnalysisResult {
  scanType: string;
  findings: string[];
  impression: string;
  confidenceScore: number;
  recommendedSpecialist: string;
  timestamp: number;
}

/**
 * MVVM ViewModel for AI Medication & X-Ray Lab Scanner.
 *
 * Manages pill recognition, active molecule lookup, diagnostic imaging analysis,
 * and AI prescription extraction across Web & Mobile.
 */
export class MedicalScannerViewModel implements ViewModel {
  activeTab: ScannerTab = 'MEDICATION_SEARCH';
  searchQuery = '';
  selectedImageUri: string | null = null;

  scannedMedications: ScannedMedicationItem[] = [];
  scannedDiagnostic: DiagnosticAnalysisResult | null = null;

  analyzing = false;
  error: string | null = null;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  setActiveTab(tab: ScannerTab): void {
    this.activeTab = tab;
    this.error = null;
  }

  setSearchQuery(query: string): void {
    this.searchQuery = query;
  }

  setSelectedImage(uri: string | null): void {
    this.selectedImageUri = uri;
  }

  async searchMolecule(): Promise<void> {
    if (!this.searchQuery.trim()) return;
    this.analyzing = true;
    this.error = null;
    try {
      const response = await apiRequest<{ results: ScannedMedicationItem[] }>(
        `/ai/medication-search?query=${encodeURIComponent(this.searchQuery)}`
      );
      runInAction(() => {
        // No invented matches: an absent result is no result.
        this.scannedMedications = response.results ?? [];
        this.analyzing = false;
      });
    } catch (err: unknown) {
      runInAction(() => {
        this.error = err instanceof Error ? err.message : 'Failed to search medication database.';
        this.analyzing = false;
      });
    }
  }

  async analyzeImage(imagePayload: string): Promise<void> {
    this.selectedImageUri = imagePayload;
    this.analyzing = true;
    this.error = null;
    try {
      const endpoint =
        this.activeTab === 'MEDICATION_SEARCH'
          ? '/ai/scan-prescription'
          : '/ai/scan-xray';

      const response = await apiRequest<{
        medications?: ScannedMedicationItem[];
        diagnostic?: DiagnosticAnalysisResult;
      }>(endpoint, {
        method: 'POST',
        body: JSON.stringify({ image: imagePayload }),
      });

      runInAction(() => {
        if (this.activeTab === 'MEDICATION_SEARCH') {
          this.scannedMedications = response.medications ?? [];
        } else {
          // Never show a read the service did not return. This used to fall back
          // to an invented "unremarkable chest radiograph" with 94% confidence.
          this.scannedDiagnostic = response.diagnostic ?? null;
        }
        this.analyzing = false;
      });
    } catch (err: unknown) {
      runInAction(() => {
        this.error = err instanceof Error ? err.message : 'AI Image analysis failed.';
        this.analyzing = false;
      });
    }
  }

  reset(): void {
    this.searchQuery = '';
    this.selectedImageUri = null;
    this.scannedMedications = [];
    this.scannedDiagnostic = null;
    this.error = null;
    this.analyzing = false;
  }

  dispose(): void {
    this.reset();
  }
}
