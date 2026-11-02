import { apiRequest } from '@/data/services/http';
import { careAppointments } from '../shared/clinicalData';
import type { CareAppointment, Request } from '../shared/clinicalData';
import type { EncounterNoteApi } from '../encounter-note/encounterModel';

/**
 * ClinicianConsultRoom (design page 5, Tier 1, approved 2026-10-21).
 *
 * Real: the doctor's confirmed appointments (`/work/appointments`), the
 * waiting-room state (`/consultation/{id}/state`), joining as the provider
 * (`/consultation/{id}/join-provider`) and the LiveKit call (media token, via
 * ConsultCallPanel), this appointment's note (`/encounters`) and the
 * prescriptions linked to it (`/work/prescriptions`).
 *
 * Not connected, so not shown: the student's shared records for this consult,
 * the "verified at check-in" badge (no check-in is linked to an appointment),
 * the medical certificate (legal wording and issuer not decided) and the
 * follow-up chat window (no setting for it). Ending leaves the call; nothing
 * on the server is "closed" by it, and the screen does not claim otherwise.
 */

interface ConsultState {
  status: string;
  studentJoined: boolean;
  providerJoined: boolean;
  /** True only when a LiveKit server is configured. */
  liveMedia: boolean;
}

interface ConsultPrescription {
  id: string;
  encounterId: string;
  patientId: string;
  status: string;
  issuedAt: number;
  allergyCheck: { checkedAt?: number };
  items: { id: string; genericName: string; strength: string; dose: string; frequency: string; durationDays: number }[];
}

export interface ConsultData {
  /** Confirmed appointments, soonest first: the ones a call can be joined for. */
  appointments: CareAppointment[];
  current: CareAppointment | null;
  state: ConsultState | null;
  note: EncounterNoteApi | null;
  prescriptions: ConsultPrescription[];
}

export interface ConsultSource {
  load(appointmentId: string | null): Promise<ConsultData | null>;
  /** Marks the doctor as joined; the server refuses until the student is in the waiting room. */
  joinAsProvider?: (appointmentId: string) => Promise<void>;
}

const PRESCRIPTION_PAGE = 100;

/** "2026-10-21T10:00" as epoch ms, read as local time (the slot has no zone). */
function slotTime(slotStart: string): number {
  const ms = new Date(slotStart).getTime();
  return Number.isFinite(ms) ? ms : Number.POSITIVE_INFINITY;
}

/** The asked-for appointment if it is confirmed, else the one nearest to now. */
export function pickAppointment(confirmed: CareAppointment[], wanted: string | null, now: number = Date.now()): CareAppointment | null {
  if (wanted) {
    const hit = confirmed.find((a) => a.id === wanted);
    if (hit) return hit;
  }
  return [...confirmed].sort((a, b) => Math.abs(slotTime(a.slotStart) - now) - Math.abs(slotTime(b.slotStart) - now))[0] ?? null;
}

export function consultApiSource(request: Request = apiRequest): ConsultSource {
  return {
    async load(appointmentId) {
      const confirmed = (await careAppointments(request)).filter((a) => a.status === 'CONFIRMED').sort((a, b) => a.slotStart.localeCompare(b.slotStart));
      const current = pickAppointment(confirmed, appointmentId);
      if (!current) return { appointments: confirmed, current: null, state: null, note: null, prescriptions: [] };
      const [state, notes, prescriptions] = await Promise.all([
        request<ConsultState>(`/consultation/${encodeURIComponent(current.id)}/state`),
        request<{ items: EncounterNoteApi[] }>('/encounters'),
        request<{ items: ConsultPrescription[] }>(`/work/prescriptions?limit=${PRESCRIPTION_PAGE}`),
      ]);
      const note = notes.items.find((n) => n.appointmentId === current.id) ?? null;
      return {
        appointments: confirmed,
        current,
        state,
        note,
        // Only prescriptions linked to this consult's note: never another visit's.
        prescriptions: note ? prescriptions.items.filter((p) => p.encounterId === note.id && p.patientId === current.patientId) : [],
      };
    },
    async joinAsProvider(appointmentId) {
      await request(`/consultation/${encodeURIComponent(appointmentId)}/join-provider`, { method: 'POST' });
    },
  };
}
