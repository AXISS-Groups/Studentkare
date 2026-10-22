import { apiRequest } from '@/data/services/http';

/**
 * Medicine information (backend services/medicine_info.py; plan
 * docs/plans/tier1-medicine-info-2026-10-22.md). Product reference data on the
 * commerce plane: nothing here sends or receives anything about the person.
 * The age band a person picks never leaves the device, so no call takes one.
 */

export type AgeBand = 'UNDER_2' | 'CHILD' | 'TEEN' | 'ADULT' | 'OLDER_ADULT' | 'PREGNANT_BREASTFEEDING';
export type Schedule = 'OTC' | 'H' | 'H1' | 'X';
export type MatchedOn = 'brand' | 'composition' | 'strength';

export interface MedicineSummary {
  id: string;
  brand: string;
  composition: string;
  form: string;
  pack: string;
  manufacturer: string;
  schedule: Schedule;
  requiresPrescription: boolean;
  /** At least one pharmacist-reviewed field exists. */
  reviewed: boolean;
  matchedOn: MatchedOn[];
}

export interface CrisisResource { label: string; number: string; detail: string }

export type SearchResponse =
  | { status: 'OK'; results: MedicineSummary[] }
  | { status: 'CRISIS'; kind: string; resources: CrisisResource[]; results: [] };

export interface ReviewNote { source: { title: string; url: string | null }; reviewedOn: string | null }
export interface ReviewedLines extends ReviewNote { items: string[] }
export interface AgeEntry { band: AgeBand; form: string; strength: string }
export interface ReviewedAges extends ReviewNote { items: AgeEntry[] }

export type BuyState =
  | { state: 'BUY'; itemId: string; pricePaise: number }
  | { state: 'PRESCRIPTION'; itemId: string | null }
  | { state: 'OUT_OF_STOCK'; itemId: string }
  | { state: 'NOT_SOLD'; itemId: null };

export interface RelatedMedicine {
  id: string;
  brand: string;
  composition: string;
  form: string;
  pack: string;
  manufacturer: string;
  schedule: Schedule;
  requiresPrescription: boolean;
  buy: BuyState;
  ageAvailability?: ReviewedAges;
}

export interface MedicineDetail {
  id: string;
  brand: string;
  composition: string;
  form: string;
  pack: string;
  manufacturer: string;
  schedule: Schedule;
  requiresPrescription: boolean;
  /** All six identity fields reviewed (and unchanged since); null otherwise. */
  identityReview: ReviewNote | null;
  fields: {
    uses: ReviewedLines | null;
    side_effects: ReviewedLines | null;
    warnings: ReviewedLines | null;
    storage: ReviewedLines | null;
    age_availability: ReviewedAges | null;
  };
  reviewed: boolean;
  sameSalt: RelatedMedicine[];
  alternatives: RelatedMedicine[];
  alternativesRestricted: boolean;
  buy: BuyState;
}

export type ReaderState = 'NOT_CONFIGURED' | 'UNAVAILABLE' | 'READY';
export type PhotoState = 'NOT_CONFIGURED' | 'UNAVAILABLE' | 'READ' | 'NO_TEXT' | 'FAILED';
export interface PhotoResponse { state: PhotoState; text: string; candidates: MedicineSummary[] }

/** A photo chosen on the device; it is sent once to be read and never kept. */
export interface PickedPhoto { append: (form: FormData) => void }

export class MedicineInfoRepository {
  constructor(private readonly request: typeof apiRequest = apiRequest) {}

  search(q: string, signal?: AbortSignal): Promise<SearchResponse> {
    return this.request<SearchResponse>(`/medicine-info/search?q=${encodeURIComponent(q)}`, { signal });
  }

  medicine(id: string): Promise<MedicineDetail> {
    return this.request<MedicineDetail>(`/medicine-info/medicines/${encodeURIComponent(id)}`);
  }

  readerStatus(): Promise<{ state: ReaderState }> {
    return this.request<{ state: ReaderState }>('/medicine-info/photo/status');
  }

  readPhoto(photo: PickedPhoto): Promise<PhotoResponse> {
    const form = new FormData();
    photo.append(form);
    return this.request<PhotoResponse>('/medicine-info/photo', { method: 'POST', body: form });
  }
}
