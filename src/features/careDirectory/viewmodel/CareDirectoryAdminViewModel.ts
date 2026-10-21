import { makeAutoObservable, runInAction } from 'mobx';
import { ApiError, apiRequest } from '@/data/services/http';
import type { ViewModel } from '@/core/store/ViewModel';
import type { FacilityKind, RegistryStatus } from '../model/types';

/**
 * Care directory listings for the super admin (every campus, partners, the
 * registry) and a campus administrator (their campus only). Every change goes
 * through /ops/care-facilities, which audits it; the server decides scope.
 */
export type AdminPhase = 'loading' | 'ready' | 'error';
export type FacilityStatus = 'VERIFIED' | 'UNVERIFIED' | 'STALE';

export interface AdminFacility {
  id: string;
  kind: FacilityKind;
  name: string;
  departments: string[];
  address: string;
  area: string;
  pincode: string;
  latitude: number | null;
  longitude: number | null;
  phone: string;
  emergency24x7: boolean;
  hoursText: string;
  source: string;
  sourceUrl: string;
  verifiedOn: string | null;
  campus: string;
  active: boolean;
  status: FacilityStatus;
  updatedAt: number | null;
}

export interface PartnerListing {
  id: string;
  kind: 'PHARMACY' | 'CLINIC';
  name: string;
  pincode: string;
  hasCoordinates: boolean;
  verifiedOn: string | null;
  shown: boolean;
  hiddenBecause: 'INACTIVE' | 'LICENCE' | 'UNVERIFIED' | 'STALE' | null;
}

/** The add / edit form, as the inputs hold it. */
export interface FacilityForm {
  id: string | null;
  kind: FacilityKind;
  name: string;
  departments: string;
  address: string;
  area: string;
  pincode: string;
  latitude: string;
  longitude: string;
  phone: string;
  emergency24x7: boolean;
  hoursText: string;
  source: string;
  sourceUrl: string;
  verifiedOn: string;
  campus: string;
  active: boolean;
}

export const BLANK_FORM: FacilityForm = {
  id: null, kind: 'HOSPITAL', name: '', departments: '', address: '', area: '', pincode: '', latitude: '', longitude: '', phone: '',
  emergency24x7: false, hoursText: '', source: '', sourceUrl: '', verifiedOn: '', campus: '', active: true,
};

export function formFrom(row: AdminFacility): FacilityForm {
  return {
    id: row.id, kind: row.kind, name: row.name, departments: row.departments.join(', '), address: row.address, area: row.area, pincode: row.pincode,
    latitude: row.latitude === null ? '' : String(row.latitude), longitude: row.longitude === null ? '' : String(row.longitude), phone: row.phone,
    emergency24x7: row.emergency24x7, hoursText: row.hoursText, source: row.source, sourceUrl: row.sourceUrl, verifiedOn: row.verifiedOn ?? '',
    campus: row.campus, active: row.active,
  };
}

const coordinate = (value: string): number | null => (value.trim() === '' ? null : Number(value.trim()));

/** The request body. A campus administrator never sends a campus: the server sets theirs. */
export function payloadFrom(form: FacilityForm, superAdmin: boolean): Record<string, unknown> {
  const body: Record<string, unknown> = {
    kind: form.kind, name: form.name, departments: form.departments.split(',').map((d) => d.trim()).filter(Boolean), address: form.address,
    area: form.area, pincode: form.pincode.trim(), latitude: coordinate(form.latitude), longitude: coordinate(form.longitude), phone: form.phone,
    emergency24x7: form.emergency24x7, hoursText: form.hoursText, source: form.source, sourceUrl: form.sourceUrl.trim(),
    verifiedOn: form.verifiedOn || null, active: form.active,
  };
  if (superAdmin) body.campus = form.campus;
  return body;
}

export class CareDirectoryAdminViewModel implements ViewModel {
  phase: AdminPhase = 'loading';
  items: AdminFacility[] = [];
  /** null for a super admin (every campus); the administrator's own campus otherwise. */
  campus: string | null = null;
  maxAgeDays = 0;
  partnersPhase: AdminPhase = 'loading';
  partners: PartnerListing[] = [];
  registry: RegistryStatus | null = null;
  form: FacilityForm | null = null;
  saving = false;
  formError = '';
  removing: AdminFacility | null = null;
  busyId: string | null = null;
  notice: 'saved' | 'removed' | 'verified' | null = null;
  actionError = '';
  private disposed = false;

  constructor(readonly superAdmin: boolean, private readonly request: typeof apiRequest = apiRequest) {
    makeAutoObservable<CareDirectoryAdminViewModel, 'disposed' | 'request'>(this, { disposed: false, request: false, superAdmin: false }, { autoBind: true });
  }

  load(): void {
    this.disposed = false;
    void this.loadFacilities();
    if (this.superAdmin) {
      void this.loadPartners();
      void this.loadRegistry();
    }
  }

  async loadFacilities(): Promise<void> {
    this.phase = 'loading';
    try {
      const res = await this.request<{ items: AdminFacility[]; campus: string | null; maxAgeDays: number }>('/ops/care-facilities');
      if (this.disposed) return;
      runInAction(() => { this.items = res.items; this.campus = res.campus; this.maxAgeDays = res.maxAgeDays; this.phase = 'ready'; });
    } catch {
      if (!this.disposed) runInAction(() => { this.phase = 'error'; });
    }
  }

  async loadPartners(): Promise<void> {
    this.partnersPhase = 'loading';
    try {
      const res = await this.request<{ items: PartnerListing[] }>('/ops/care-directory/partners');
      if (!this.disposed) runInAction(() => { this.partners = res.items; this.partnersPhase = 'ready'; });
    } catch {
      if (!this.disposed) runInAction(() => { this.partnersPhase = 'error'; });
    }
  }

  async loadRegistry(): Promise<void> {
    try {
      const res = await this.request<RegistryStatus>('/care-directory/registry');
      if (!this.disposed) runInAction(() => { this.registry = res; });
    } catch {
      if (!this.disposed) runInAction(() => { this.registry = null; });
    }
  }

  startAdd(): void {
    this.form = { ...BLANK_FORM };
    this.formError = '';
  }

  startEdit(row: AdminFacility): void {
    this.form = formFrom(row);
    this.formError = '';
  }

  closeForm(): void {
    this.form = null;
    this.formError = '';
  }

  setField<K extends keyof FacilityForm>(key: K, value: FacilityForm[K]): void {
    if (this.form) this.form = { ...this.form, [key]: value };
  }

  async save(): Promise<boolean> {
    const form = this.form;
    if (!form || this.saving) return false;
    this.saving = true;
    this.formError = '';
    try {
      const body = JSON.stringify(payloadFrom(form, this.superAdmin));
      const saved = form.id
        ? await this.request<AdminFacility>(`/ops/care-facilities/${encodeURIComponent(form.id)}`, { method: 'PATCH', body })
        : await this.request<AdminFacility>('/ops/care-facilities', { method: 'POST', body });
      if (this.disposed) return true;
      runInAction(() => {
        this.items = form.id ? this.items.map((row) => (row.id === saved.id ? saved : row)) : [...this.items, saved].sort((a, b) => a.name.localeCompare(b.name));
        this.form = null;
        this.notice = 'saved';
      });
      return true;
    } catch (error) {
      if (!this.disposed) runInAction(() => { this.formError = error instanceof ApiError ? error.message : ''; });
      return false;
    } finally {
      if (!this.disposed) runInAction(() => { this.saving = false; });
    }
  }

  askRemove(row: AdminFacility | null): void {
    this.removing = row;
  }

  async confirmRemove(): Promise<void> {
    const row = this.removing;
    if (!row) return;
    this.busyId = row.id;
    this.actionError = '';
    try {
      await this.request<{ success: boolean }>(`/ops/care-facilities/${encodeURIComponent(row.id)}`, { method: 'DELETE' });
      if (!this.disposed) runInAction(() => { this.items = this.items.filter((r) => r.id !== row.id); this.notice = 'removed'; });
    } catch (error) {
      if (!this.disposed) runInAction(() => { this.actionError = error instanceof ApiError ? error.message : ''; });
    } finally {
      if (!this.disposed) runInAction(() => { this.busyId = null; this.removing = null; });
    }
  }

  async verifyPartner(id: string): Promise<void> {
    this.busyId = id;
    this.actionError = '';
    try {
      await this.request(`/ops/service-providers/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ verified: true }) });
      if (this.disposed) return;
      runInAction(() => { this.notice = 'verified'; });
      await this.loadPartners();
    } catch (error) {
      if (!this.disposed) runInAction(() => { this.actionError = error instanceof ApiError ? error.message : ''; });
    } finally {
      if (!this.disposed) runInAction(() => { this.busyId = null; });
    }
  }

  clearNotice(): void {
    this.notice = null;
  }

  reset(): void {
    this.form = null;
    this.removing = null;
    this.notice = null;
  }

  dispose(): void {
    this.disposed = true;
  }
}
