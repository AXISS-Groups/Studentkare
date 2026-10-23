import { apiRequest } from '@/data/services/http';

/**
 * The student's camp day (design page 6 "CampDay", Tier 2): the camp, their
 * slot, and where they are in the stations. Shared by the web panel and the
 * Expo screen.
 *
 * Only what `/camps`, `/camps/{id}/me`, `/camps/{id}/slots` and
 * `/camps/{id}/stations` return. The board's token number, "students ahead",
 * per-station waits and the live queue have no endpoint, so they are not
 * drawn as numbers; the view says the queue isn't connected.
 */

export interface CampSummary { id: string; name: string; date: string; location: string; whatToBring?: string }
export interface CampStatus { registered: boolean; checkedIn: boolean; completedStations: string[]; slotId?: string | null }
export interface CampStation { id: string; name: string; sort: number }
export interface CampSlot { id: string; slotStart: string; slotEnd: string }

export interface CampDayData {
  camp: CampSummary;
  status: CampStatus;
  stations: CampStation[];
  slot: CampSlot | null;
}

export type StationState = 'done' | 'now' | 'next';

export interface CampDayStationView extends CampStation { state: StationState }

export interface CampDayView {
  /** The camp is on today's date (the board's "TODAY" pill). */
  isToday: boolean;
  stations: CampDayStationView[];
  /** The station the student is at, once checked in; null before check-in or when all are done. */
  current: CampDayStationView | null;
  allDone: boolean;
}

/** ISO date (YYYY-MM-DD) of `now` in the student's own calendar. */
export function localIsoDate(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function campDayView(data: CampDayData, now: Date): CampDayView {
  const done = new Set(data.status.completedStations);
  const ordered = [...data.stations].sort((a, b) => a.sort - b.sort);
  const firstOpen = ordered.find((station) => !done.has(station.id)) ?? null;
  const stations = ordered.map((station): CampDayStationView => ({
    ...station,
    state: done.has(station.id) ? 'done' : data.status.checkedIn && firstOpen?.id === station.id ? 'now' : 'next',
  }));
  return {
    isToday: data.camp.date === localIsoDate(now),
    stations,
    current: stations.find((station) => station.state === 'now') ?? null,
    allDone: ordered.length > 0 && firstOpen === null,
  };
}

/**
 * The first camp (by date) the student is registered for, with its stations and
 * slot; null when they are registered for none. Used by the phone screen, which
 * has no camp list of its own.
 */
export async function loadMyCampDay(signal?: AbortSignal): Promise<CampDayData | null> {
  const camps = await apiRequest<{ items: CampSummary[] }>('/camps', { signal });
  for (const camp of camps.items) {
    const status = await apiRequest<CampStatus>(`/camps/${encodeURIComponent(camp.id)}/me`, { signal });
    if (!status.registered) continue;
    const [stations, slots] = await Promise.all([
      apiRequest<{ items: CampStation[] }>(`/camps/${encodeURIComponent(camp.id)}/stations`, { signal }),
      apiRequest<{ items: CampSlot[] }>(`/camps/${encodeURIComponent(camp.id)}/slots`, { signal }),
    ]);
    return { camp, status, stations: stations.items, slot: slots.items.find((slot) => slot.id === status.slotId) ?? null };
  }
  return null;
}

/** One camp's day for the student (the camp list's "Open camp day"); null when they hold no place at it. */
export async function loadCampDay(campId: string, signal?: AbortSignal): Promise<CampDayData | null> {
  const id = encodeURIComponent(campId);
  const camps = await apiRequest<{ items: CampSummary[] }>('/camps', { signal });
  const status = await apiRequest<CampStatus>(`/camps/${id}/me`, { signal });
  const camp = camps.items.find((item) => item.id === campId);
  if (!camp || !status.registered) return null;
  const [stations, slots] = await Promise.all([
    apiRequest<{ items: CampStation[] }>(`/camps/${id}/stations`, { signal }),
    apiRequest<{ items: CampSlot[] }>(`/camps/${id}/slots`, { signal }),
  ]);
  return { camp, status, stations: stations.items, slot: slots.items.find((slot) => slot.id === status.slotId) ?? null };
}

export function checkInToCamp(campId: string): Promise<unknown> {
  return apiRequest(`/camps/${encodeURIComponent(campId)}/check-in`, { method: 'POST' });
}

export function completeCampStation(campId: string, stationId: string): Promise<unknown> {
  return apiRequest(`/camps/${encodeURIComponent(campId)}/stations/${encodeURIComponent(stationId)}`, { method: 'POST' });
}
