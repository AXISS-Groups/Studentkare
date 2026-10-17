import { makeAutoObservable, runInAction } from 'mobx';
import { apiRequest } from '@/data/http';
import type { ViewModel } from '@/core/store/ViewModel';
import type { MemberProfile } from '@/data/types/workflowTypes';
import type { MessageKey } from '@/i18n';

/** Exactly the values PATCH /api/profile accepts ('' = not recorded). Hyphen, not a minus sign. */
export const BLOOD_GROUPS = ['', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'] as const;
export type BloodGroup = (typeof BLOOD_GROUPS)[number];
export const RELATIONS = ['Parent', 'Sibling', 'Partner', 'Friend', 'Warden', 'Other'] as const;

export const isValidIndianMobile = (phone: string): boolean => /^[6-9]\d{9}$/.test(phone.trim());

export interface EmergencyCardDraft {
  bloodGroup: BloodGroup;
  allergies: string;
  conditions: string;
  contactName: string;
  contactPhone: string;
  contactRelation: string;
}

const splitList = (text: string): string[] => text.split(',').map((s) => s.trim()).filter(Boolean);
const isBloodGroup = (value: string): value is BloodGroup => (BLOOD_GROUPS as readonly string[]).includes(value);

function draftFrom(profile: MemberProfile): EmergencyCardDraft {
  return {
    bloodGroup: isBloodGroup(profile.bloodGroup) ? profile.bloodGroup : '',
    allergies: profile.allergies.join(', '),
    conditions: profile.chronicConditions.join(', '),
    contactName: profile.emergencyContactName,
    contactPhone: profile.emergencyContactPhone.replace(/\D/g, '').slice(-10),
    contactRelation: profile.emergencyContactRelation,
  };
}

/**
 * The emergency card (design: EmergencyCard / WebEmergencyCard, Tier 1 —
 * rebuilt 2026-10-09 with the repository owner as named reviewer; clinical
 * review still owed).
 *
 * Reads and writes only the student's own profile (GET/PATCH /api/profile).
 * It replaces an editor that opened pre-filled with an invented penicillin
 * allergy, asthma, an inhaler and a contact called "Sunita C."; saved those to
 * the real profile if the student pressed Save; reported "Saved" when the save
 * failed; sent blood groups the server rejects; and promised an offline card
 * and QR that do not exist.
 */
export class EmergencyCardViewModel implements ViewModel {
  saved: EmergencyCardDraft | null = null;
  draft: EmergencyCardDraft | null = null;
  loadFailed = false;
  saving = false;
  /** Message keys, translated by the view. */
  error: MessageKey | null = null;
  notice: MessageKey | null = null;
  private disposed = false;

  constructor(private readonly request: typeof apiRequest = apiRequest) {
    makeAutoObservable<EmergencyCardViewModel, 'disposed' | 'request'>(this, { disposed: false, request: false }, { autoBind: true });
  }

  get loading(): boolean {
    return this.saved === null && !this.loadFailed;
  }

  get dirty(): boolean {
    return Boolean(this.saved && this.draft && JSON.stringify(this.saved) !== JSON.stringify(this.draft));
  }

  get phoneError(): boolean {
    return Boolean(this.draft && this.draft.contactPhone !== '' && !isValidIndianMobile(this.draft.contactPhone));
  }

  get canSave(): boolean {
    return this.dirty && !this.phoneError && !this.saving;
  }

  /** What a responder needs that is still missing from the saved card. */
  get missing(): MessageKey[] {
    const s = this.saved;
    if (!s) return [];
    const out: MessageKey[] = [];
    if (!s.bloodGroup) out.push('ice.missing.blood');
    if (!s.contactName || !isValidIndianMobile(s.contactPhone)) out.push('ice.missing.contact');
    return out;
  }

  async load(): Promise<void> {
    this.disposed = false;
    this.loadFailed = false;
    try {
      const profile = await this.request<MemberProfile>('/profile');
      if (this.disposed) return;
      runInAction(() => { this.saved = draftFrom(profile); this.draft = draftFrom(profile); });
    } catch {
      if (!this.disposed) runInAction(() => { this.loadFailed = true; });
    }
  }

  set<K extends keyof EmergencyCardDraft>(field: K, value: EmergencyCardDraft[K]): void {
    if (!this.draft) return;
    this.draft = { ...this.draft, [field]: field === 'contactPhone' ? String(value).replace(/\D/g, '').slice(0, 10) : value };
    this.notice = null;
  }

  discard(): void {
    if (this.saved) this.draft = { ...this.saved };
    this.error = null;
  }

  async save(): Promise<void> {
    if (!this.canSave || !this.draft) return;
    const d = this.draft;
    this.saving = true;
    this.error = null;
    this.notice = null;
    try {
      const profile = await this.request<MemberProfile>('/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          bloodGroup: d.bloodGroup,
          allergies: splitList(d.allergies),
          chronicConditions: splitList(d.conditions),
          emergencyContactName: d.contactName.trim(),
          emergencyContactPhone: d.contactPhone,
          emergencyContactRelation: d.contactRelation,
        }),
      });
      runInAction(() => {
        this.saved = draftFrom(profile);
        this.draft = draftFrom(profile);
        this.saving = false;
        this.notice = 'ice.saved';
      });
    } catch {
      // Fail closed: the card still shows the last saved details, and says so.
      runInAction(() => { this.saving = false; this.error = 'ice.saveFailed'; });
    }
  }

  dispose(): void {
    this.disposed = true;
  }

  reset(): void {
    this.saved = null;
    this.draft = null;
    this.loadFailed = false;
    this.error = null;
    this.notice = null;
  }
}
