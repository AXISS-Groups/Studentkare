import { makeAutoObservable } from 'mobx';
import { apiRequest } from '@/data/services/http';
import type { ViewModel } from '@/core/store/ViewModel';
import { Resource } from '@/features/m2health/resource';
import type { Page, VaccineOffering } from '../models';

/**
 * Mobile 2.0 Vaccines, the booking half (M2Vaccines; plan package A,
 * D-M2-3, D-M2-4, D-M2-5, approved by Krishna Chintakayala 2026-10-21).
 *
 * The picker is built from the vaccine names in the verified directory
 * (GET /preventive/vaccines); each name's badge is its initials, computed.
 * Each offering shows what the directory records: provider, price
 * (`price_paise`, "not listed" when null), availability and when it was last
 * checked. There is no vaccine slot API, so "Pick a slot" is unavailable; no
 * "why" text or dose schedule is shown until a clinician-reviewed source
 * exists; "Vaccine only" is dropped (clinic-given only). The student's own
 * vaccine record is not on this store-rail page: it lives in My health (D-M2-3).
 */
const LISTED = 50;

/** "Hepatitis B" gives "HB"; "Influenza" gives "IN". */
export function badgeOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length > 1) return words.slice(0, 2).map((w) => w.charAt(0)).join('').toUpperCase();
  return (words[0] ?? '').slice(0, 2).toUpperCase();
}

export class VaccinesViewModel implements ViewModel {
  readonly offerings: Resource<Page<VaccineOffering>>;
  picked: string | null = null;

  constructor(request: typeof apiRequest = apiRequest) {
    this.offerings = new Resource(() => request<Page<VaccineOffering>>(`/preventive/vaccines?offset=0&limit=${LISTED}`));
    makeAutoObservable(this, { offerings: false }, { autoBind: true });
  }

  /** Each vaccine the directory lists, once, in the order first listed. */
  get names(): string[] {
    const seen: string[] = [];
    for (const o of this.offerings.data?.items ?? []) if (!seen.includes(o.vaccineName)) seen.push(o.vaccineName);
    return seen;
  }

  get selected(): string | null {
    return this.picked && this.names.includes(this.picked) ? this.picked : this.names[0] ?? null;
  }

  get selectedOfferings(): VaccineOffering[] {
    const name = this.selected;
    return (this.offerings.data?.items ?? []).filter((o) => o.vaccineName === name);
  }

  pick(name: string): void {
    this.picked = name;
  }

  load(): void {
    void this.offerings.load();
  }

  dispose(): void {
    this.offerings.cancel();
  }

  reset(): void {
    this.dispose();
    this.picked = null;
  }
}
