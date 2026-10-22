import { makeAutoObservable, runInAction } from 'mobx';
import { ApiError, apiRequest } from '@/data/services/http';
import type { ViewModel } from '@/core/store/ViewModel';
import type { LiveCatalogItem } from '@/data/types/workflowTypes';
import type { AvailabilitySlot } from '@/features/appointments/viewmodel/AppointmentBookingViewModel';
import { soonestOpen } from '@/features/m2store/viewmodel/ConsultsViewModel';
import { distanceKm } from '../model/geo';
import type { Locate } from '../model/location';
import type { Coordinates, DirectoryPage, DirectorySegment, Facility, PlaceSegment } from '../model/types';
import { PLACE_SEGMENTS } from '../model/types';

/**
 * Find care near you (M2FindCare, M2FacilityDetail, WebFindCare): one view model
 * for the web phone frame, the web pages and Expo.
 *
 * Places come from GET /care-directory (verified listings only); doctors are the
 * consultation listings (GET /catalog?kind=consultation) grouped by department
 * (their catalogue category), with the next open slot (GET
 * /appointments/availability) when signed in. Location is asked for only on
 * request; the position stays in this object's memory and is never part of a
 * request, so distance is computed here and nowhere else.
 */
export type Phase = 'idle' | 'loading' | 'ready' | 'error';
export type LocationState = 'off' | 'asking' | 'on' | 'denied' | 'unavailable' | 'timeout' | 'unsupported';
export type DetailPhase = 'idle' | 'loading' | 'ready' | 'missing' | 'error';

export interface PlaceList {
  phase: Phase;
  items: Facility[];
}

export interface DoctorOption {
  service: LiveCatalogItem;
  /** The soonest open slot; null when none is open; undefined while it loads, when signed out, or when it could not be read. */
  next: AvailabilitySlot | null | undefined;
}

export interface Department {
  key: string;
  name: string;
  options: DoctorOption[];
}

export interface ListedPlace {
  facility: Facility;
  /** Kilometres from the student, only while they share their location and the place has coordinates. */
  distanceKm: number | null;
}

/** The catalogue's page cap (GET /api/catalog). */
const CATALOG_PAGE_MAX = 100;
const HTTP_NOT_FOUND = 404;

/** A catalogue category as a department name: "general-medicine" becomes "General medicine". */
export function departmentName(category: string): string {
  const words = category.replace(/[_-]+/g, ' ').trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : '';
}

export interface CareDirectoryDeps {
  locate: Locate;
  signedIn: boolean;
  request?: typeof apiRequest;
}

export class CareDirectoryViewModel implements ViewModel {
  segment: DirectorySegment = 'hospitals';
  places: Record<PlaceSegment, PlaceList> = { hospitals: { phase: 'idle', items: [] }, pharmacies: { phase: 'idle', items: [] }, ambulance: { phase: 'idle', items: [] } };
  doctorsPhase: Phase = 'idle';
  doctors: DoctorOption[] = [];
  location: LocationState = 'off';
  detailPhase: DetailPhase = 'idle';
  detail: Facility | null = null;
  readonly signedIn: boolean;
  private here: Coordinates | null = null;
  private disposed = false;
  private readonly locate: Locate;
  private readonly request: typeof apiRequest;

  constructor({ locate, signedIn, request = apiRequest }: CareDirectoryDeps) {
    this.locate = locate;
    this.signedIn = signedIn;
    this.request = request;
    makeAutoObservable<CareDirectoryViewModel, 'here' | 'disposed' | 'locate' | 'request'>(
      this, { here: true, disposed: false, locate: false, request: false }, { autoBind: true },
    );
  }

  /** The current tab's places, nearest first while the student shares their location. */
  get listed(): ListedPlace[] {
    if (this.segment === 'doctors') return [];
    const rows = this.places[this.segment].items.map((facility) => ({ facility, distanceKm: this.distanceTo(facility) }));
    if (!this.here) return rows;
    // Places without coordinates keep the server's order, after the ones we can measure.
    return rows
      .map((row, index) => ({ row, index }))
      .sort((a, b) => (a.row.distanceKm ?? Infinity) - (b.row.distanceKm ?? Infinity) || a.index - b.index)
      .map(({ row }) => row);
  }

  get placePhase(): Phase {
    return this.segment === 'doctors' ? this.doctorsPhase : this.places[this.segment].phase;
  }

  /** Consultations by department (catalogue category), departments and doctors in name order. */
  get departments(): Department[] {
    const groups = new Map<string, DoctorOption[]>();
    for (const option of this.doctors) {
      const key = option.service.category.trim().toLowerCase() || 'general';
      groups.set(key, [...(groups.get(key) ?? []), option]);
    }
    return [...groups.entries()]
      .map(([key, options]) => ({ key, name: departmentName(key), options: [...options].sort((a, b) => (a.service.brand || a.service.name).localeCompare(b.service.brand || b.service.name)) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  distanceTo(facility: Facility): number | null {
    return this.here && facility.coordinates ? distanceKm(this.here, facility.coordinates) : null;
  }

  /** Open the directory on a tab (the first load of each tab happens here). */
  start(segment: DirectorySegment = this.segment): void {
    this.disposed = false;
    this.select(segment);
  }

  select(segment: DirectorySegment): void {
    this.segment = segment;
    if (segment === 'doctors') {
      if (this.doctorsPhase === 'idle') void this.loadDoctors();
    } else if (this.places[segment].phase === 'idle') {
      void this.loadPlaces(segment);
    }
  }

  retry(): void {
    if (this.segment === 'doctors') void this.loadDoctors();
    else void this.loadPlaces(this.segment);
  }

  async loadPlaces(segment: PlaceSegment): Promise<void> {
    this.places[segment] = { phase: 'loading', items: this.places[segment].items };
    try {
      const page = await this.request<DirectoryPage>(`/care-directory?segment=${segment}`);
      if (this.disposed) return;
      runInAction(() => { this.places[segment] = { phase: 'ready', items: page.items }; });
    } catch {
      if (!this.disposed) runInAction(() => { this.places[segment] = { phase: 'error', items: [] }; });
    }
  }

  async loadDoctors(): Promise<void> {
    this.doctorsPhase = 'loading';
    try {
      const res = await this.request<{ items: LiveCatalogItem[] }>(`/catalog?kind=consultation&limit=${CATALOG_PAGE_MAX}&offset=0`);
      if (this.disposed) return;
      runInAction(() => {
        this.doctors = res.items.filter((item) => item.active !== false).map((service) => ({ service, next: undefined }));
        this.doctorsPhase = 'ready';
      });
      // Slots need a session; signed out there is nothing to ask.
      if (this.signedIn) await Promise.all(this.doctors.map((option) => this.loadNext(option.service.id)));
    } catch {
      if (!this.disposed) runInAction(() => { this.doctorsPhase = 'error'; this.doctors = []; });
    }
  }

  private async loadNext(serviceId: string): Promise<void> {
    let next: AvailabilitySlot | null | undefined;
    try {
      const res = await this.request<{ slots: AvailabilitySlot[] }>(`/appointments/availability?catalogItemId=${encodeURIComponent(serviceId)}&date=`);
      next = soonestOpen(res.slots);
    } catch {
      next = undefined;
    }
    if (this.disposed) return;
    runInAction(() => {
      this.doctors = this.doctors.map((option) => (option.service.id === serviceId ? { ...option, next } : option));
    });
  }

  /** Ask the device once. Whatever the answer, nothing is sent or stored. */
  async useLocation(): Promise<void> {
    if (this.location === 'asking') return;
    this.location = 'asking';
    let result: Awaited<ReturnType<Locate>>;
    try {
      result = await this.locate();
    } catch {
      result = { status: 'unavailable' };
    }
    if (this.disposed) return;
    runInAction(() => {
      if (result.status === 'granted') {
        this.here = result.coordinates;
        this.location = 'on';
      } else {
        this.here = null;
        this.location = result.status;
      }
    });
  }

  /** Forget the position (it was only ever in memory). */
  stopLocation(): void {
    this.here = null;
    this.location = 'off';
  }

  /** A place from the list: shown at once, no second request. */
  open(facility: Facility): void {
    this.detail = facility;
    this.detailPhase = 'ready';
  }

  /** A place by id (a deep link, or Expo's route params). */
  async openById(id: string): Promise<void> {
    const known = PLACE_SEGMENTS.flatMap((s) => this.places[s].items).find((f) => f.id === id);
    if (known) {
      this.open(known);
      return;
    }
    this.detail = null;
    this.detailPhase = 'loading';
    try {
      const facility = await this.request<Facility>(`/care-directory/${encodeURIComponent(id)}`);
      if (!this.disposed) runInAction(() => { this.detail = facility; this.detailPhase = 'ready'; });
    } catch (error) {
      if (!this.disposed) runInAction(() => { this.detailPhase = error instanceof ApiError && error.status === HTTP_NOT_FOUND ? 'missing' : 'error'; });
    }
  }

  closeDetail(): void {
    this.detail = null;
    this.detailPhase = 'idle';
  }

  reset(): void {
    this.segment = 'hospitals';
    this.places = { hospitals: { phase: 'idle', items: [] }, pharmacies: { phase: 'idle', items: [] }, ambulance: { phase: 'idle', items: [] } };
    this.doctorsPhase = 'idle';
    this.doctors = [];
    this.stopLocation();
    this.closeDetail();
  }

  dispose(): void {
    this.disposed = true;
  }
}
