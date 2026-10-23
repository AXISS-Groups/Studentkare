import { makeAutoObservable } from 'mobx';
import { apiRequest } from '@/data/services/http';
import type { ViewModel } from '@/core/store/ViewModel';
import type { MemberProfile } from '@/data/types/workflowTypes';
import { Resource } from '@/features/m2health/resource';

/**
 * Mobile 2.0 Profile (M2Profile, Tier 1, plan package A): who the student is,
 * their typed basics, their documents by kind and Student Plus. Every value is
 * the server's; a card whose read failed shows its own retry.
 *
 * Plan decisions taken here: course and year and medical leave are not stored
 * (D-M2-16), so they are not drawn; blood group is "Typed by you"; the Ayush
 * row is "Not available yet" (D-M2-13, no record access built); Share with
 * family is "Coming soon" with no switch (D-M2-15). Nothing here reads a lab
 * value, and the completeness ring never counts a clinical value.
 */

interface Measure { id: string; value: number; unit: string; recordedAt: string; source: string }
export interface BodyMeasurements { weight: Measure | null; height: Measure | null }
export interface DocumentCounts { total: number; categoryCounts: Record<string, number> }
interface PlanPackage { id: string; months: number; price: number | string }
export interface Plan { id: string; name: string; price: number | string; period: string; packages: PlanPackage[] }

/**
 * The profile details the completeness ring counts, declared once. Allergies
 * are not on the list: an empty list means "not answered", and the server's
 * `noKnownAllergies` ("none") has no control on this board yet, so counting
 * allergies would punish a student who has none.
 */
export const PROFILE_FIELDS = ['name', 'dob', 'university', 'rollNumber', 'hostel', 'emergencyContact', 'bloodGroup'] as const;
export type ProfileField = (typeof PROFILE_FIELDS)[number];

const filled = (value: string | undefined | null): boolean => Boolean(value && value.trim());

export function fieldFilled(profile: MemberProfile, field: ProfileField): boolean {
  switch (field) {
    case 'name': return filled(profile.fullName);
    case 'dob': return filled(profile.dob);
    case 'university': return filled(profile.university);
    case 'rollNumber': return filled(profile.rollNumber);
    case 'hostel': return filled(profile.hostelBlock) && filled(profile.room);
    case 'emergencyContact': return filled(profile.emergencyContactName) && filled(profile.emergencyContactPhone);
    case 'bloodGroup': return filled(profile.bloodGroup);
    default: return false;
  }
}

export interface Completeness { done: number; total: number; fraction: number }

export function completeness(profile: MemberProfile): Completeness {
  const done = PROFILE_FIELDS.filter((f) => fieldFilled(profile, f)).length;
  return { done, total: PROFILE_FIELDS.length, fraction: done / PROFILE_FIELDS.length };
}

/** The document kinds the board shows as cards. Scans are OTHER documents until a SCAN category exists (D-M2-16). */
export const DOCUMENT_CARDS = [
  { key: 'lab', category: 'LAB' },
  { key: 'rx', category: 'PRESCRIPTION' },
  { key: 'scans', category: 'OTHER' },
  { key: 'vaccines', category: 'VACCINE' },
] as const;

export function countOf(counts: DocumentCounts, category: string): number {
  return counts.categoryCounts[category] ?? 0;
}

export class ProfileViewModel implements ViewModel {
  readonly profile: Resource<MemberProfile>;
  readonly body: Resource<BodyMeasurements>;
  readonly documents: Resource<DocumentCounts>;
  readonly plans: Resource<{ plans: Plan[] }>;

  constructor(request: typeof apiRequest = apiRequest) {
    this.profile = new Resource(() => request<MemberProfile>('/profile'));
    this.body = new Resource(() => request<BodyMeasurements>('/body/measurements'));
    this.documents = new Resource(async () => {
      const res = await request<Partial<DocumentCounts>>('/health/documents?limit=1');
      // An older server without the counts: show no cards rather than zeros.
      if (typeof res.total !== 'number' || !res.categoryCounts) throw new Error('No document counts.');
      return { total: res.total, categoryCounts: res.categoryCounts };
    });
    this.plans = new Resource(() => request<{ plans: Plan[] }>('/billing/plans'));
    makeAutoObservable(this, { profile: false, body: false, documents: false, plans: false }, { autoBind: true });
  }

  get completeness(): Completeness | null {
    return this.profile.data ? completeness(this.profile.data) : null;
  }

  /** Student Plus from the server's plan list; null (the card is hidden) when it is missing or the call failed. */
  get studentPlus(): Plan | null {
    return this.plans.data?.plans.find((p) => p.id === 'STUDENT_PLUS') ?? null;
  }

  load(): void {
    void this.profile.load();
    void this.body.load();
    void this.documents.load();
    void this.plans.load();
  }

  dispose(): void {
    [this.profile, this.body, this.documents, this.plans].forEach((r) => r.cancel());
  }

  reset(): void {
    this.dispose();
  }
}
