import { describe, expect, it, vi } from 'vitest';
import type { LiveCatalogItem } from '@/data/types/workflowTypes';
import { MedicineRepository, studentSafeAlternatives, type CatalogAlternativesResponse, type MedicineAlternative } from '../MedicineRepository';
import { matchesCatalogQuery } from '../catalogSearch';

type Requester = typeof import('@/data/services/http').apiRequest;

const alt = (id: string, pricePaise: number, requiresPrescription = false): MedicineAlternative => ({
  id, name: id, brand: 'Sample', pack: 'Strip of 10', pricePaise, mrpPaise: pricePaise, stock: 4, imageUrl: null,
  manufacturer: 'Sample Pharma (demo)', dosageForm: 'TABLET', composition: 'Paracetamol 500 mg', schedule: 'OTC',
  requiresPrescription,
});

const item = (overrides: Partial<LiveCatalogItem> = {}): LiveCatalogItem => ({
  id: 'i1', providerId: 'p', kind: 'product', name: 'Pyrexa 500', brand: 'Sample Pharma A', category: 'medicines',
  description: 'Sample listing', pack: 'Strip of 15', pricePaise: 2900, mrpPaise: 3400, stock: 4, active: true,
  requiresPrescription: false, preparation: '', ...overrides,
});

describe('MedicineRepository', () => {
  it('asks the shop route for the listing and returns its OTC alternatives in server order', async () => {
    const response: CatalogAlternativesResponse = {
      itemId: 'a/b', composition: 'Paracetamol 500 mg', dosageForm: 'TABLET', restricted: false,
      items: [alt('cheap', 1500), alt('dear', 2200)],
    };
    const request = vi.fn(async () => response) as unknown as Requester & ReturnType<typeof vi.fn>;
    const result = await new MedicineRepository(request).alternatives('a/b');
    expect(request).toHaveBeenCalledWith('/catalog/a%2Fb/alternatives', { signal: undefined });
    expect(result.items.map(i => i.id)).toEqual(['cheap', 'dear']);
    expect(result.composition).toBe('Paracetamol 500 mg');
    expect(result.restricted).toBe(false);
  });

  it('never hands a student the alternatives of a prescription listing', () => {
    const leaked: CatalogAlternativesResponse = {
      itemId: 'rx', composition: 'Azithromycin 500 mg', dosageForm: 'TABLET', restricted: true,
      items: [alt('other-brand', 9500, true)],
    };
    expect(studentSafeAlternatives(leaked)).toEqual({
      composition: 'Azithromycin 500 mg', dosageForm: 'TABLET', restricted: true, items: [],
    });
  });

  it('drops any prescription-only item from an OTC listing', () => {
    const mixed: CatalogAlternativesResponse = {
      itemId: 'otc', composition: 'Paracetamol 500 mg', dosageForm: 'TABLET', restricted: false,
      items: [alt('otc-brand', 1500), alt('rx-flagged', 1000, true)],
    };
    expect(studentSafeAlternatives(mixed).items.map(i => i.id)).toEqual(['otc-brand']);
  });

  it('passes the server error through', async () => {
    const request = vi.fn(async () => { throw new Error('Catalog item not found.'); }) as unknown as Requester;
    await expect(new MedicineRepository(request).alternatives('missing')).rejects.toThrow('Catalog item not found.');
  });
});

describe('matchesCatalogQuery', () => {
  it('matches a salt in the composition, whatever the case', () => {
    expect(matchesCatalogQuery(item({ composition: 'Paracetamol 500 mg' }), 'PARACET')).toBe(true);
    expect(matchesCatalogQuery(item({ composition: 'Amoxicillin 500 mg + Clavulanic Acid 125 mg' }), 'clavulanic')).toBe(true);
  });

  it('still matches name and brand, and an empty query matches everything', () => {
    expect(matchesCatalogQuery(item(), 'pyrexa')).toBe(true);
    expect(matchesCatalogQuery(item(), 'sample pharma')).toBe(true);
    expect(matchesCatalogQuery(item(), '   ')).toBe(true);
  });

  it('does not match a salt the listing does not contain, or a listing with no composition', () => {
    expect(matchesCatalogQuery(item({ composition: 'Paracetamol 500 mg' }), 'ibuprofen')).toBe(false);
    expect(matchesCatalogQuery(item({ composition: null }), 'paracetamol')).toBe(false);
  });
});
