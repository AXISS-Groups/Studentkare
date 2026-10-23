import { apiRequest } from '@/data/services/http';

/**
 * Medicine master on the shop (backend services/medicine_master.py).
 *
 * Alternatives are listings with the same salts, strengths and dosage form,
 * cheapest first. They are information only, and only for OTC medicines: for a
 * prescription-schedule listing the server returns none (substitution is the
 * prescriber's decision). This client keeps that rule too, so a screen can
 * never show a prescription item's alternatives to a student even if a
 * response were wrong. The pharmacist / prescriber route is not called here.
 */

export interface MedicineAlternative {
  id: string;
  name: string;
  brand: string;
  pack: string;
  pricePaise: number;
  mrpPaise: number;
  stock: number;
  imageUrl: string | null;
  manufacturer: string;
  dosageForm: string;
  composition: string;
  schedule: string;
  requiresPrescription: boolean;
}

/** GET /api/catalog/{id}/alternatives */
export interface CatalogAlternativesResponse {
  itemId: string;
  /** e.g. "Paracetamol 500 mg"; null when the listing has no medicine record. */
  composition: string | null;
  dosageForm: string | null;
  /** True for a prescription-schedule listing: items is always empty. */
  restricted: boolean;
  message?: string;
  items: MedicineAlternative[];
}

export interface CatalogAlternatives {
  composition: string | null;
  dosageForm: string | null;
  restricted: boolean;
  items: MedicineAlternative[];
}

/** Drops anything a student must not see: every item of a restricted listing, and any prescription-only item. */
export function studentSafeAlternatives(response: CatalogAlternativesResponse): CatalogAlternatives {
  const restricted = response.restricted === true;
  return {
    composition: response.composition ?? null,
    dosageForm: response.dosageForm ?? null,
    restricted,
    items: restricted ? [] : response.items.filter(item => item.requiresPrescription === false),
  };
}

export class MedicineRepository {
  constructor(private readonly request: typeof apiRequest = apiRequest) {}

  async alternatives(itemId: string, signal?: AbortSignal): Promise<CatalogAlternatives> {
    const response = await this.request<CatalogAlternativesResponse>(
      `/catalog/${encodeURIComponent(itemId)}/alternatives`, { signal },
    );
    return studentSafeAlternatives(response);
  }
}
