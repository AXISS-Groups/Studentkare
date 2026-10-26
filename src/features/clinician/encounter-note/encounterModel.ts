import { ApiError, apiRequest } from '@/data/services/http';
import { careAppointments } from '../shared/clinicalData';
import type { CareAppointment, Request } from '../shared/clinicalData';

/**
 * EncounterNote (design page 5, Tier 1, approved 2026-10-21) on the real
 * `/encounters` contract: a doctor writes a note only for one of their own
 * confirmed or completed appointments (the server takes the patient from
 * it), edits it while it is a DRAFT, and signs it once — FINAL is immutable,
 * and a second sign is a 409 that changes nothing.
 */

export const SOAP_KEYS = ['subjective', 'objective', 'assessment', 'plan'] as const;
export type SoapKey = typeof SOAP_KEYS[number];
export type Soap = Record<SoapKey, string>;

/** The server's per-field limit (EncounterInput). */
export const SOAP_MAX = 2000;

/** GET /encounters: items[] (this doctor's own notes, newest first). */
export interface EncounterNoteApi extends Soap {
  id: string;
  appointmentId: string;
  patientId: string;
  status: 'DRAFT' | 'FINAL' | string;
  createdAt: number;
  signedAt: number | null;
}

export interface EncounterData {
  notes: EncounterNoteApi[];
  /** Confirmed or completed appointments: who a note can be written for. */
  appointments: CareAppointment[];
}

type SignOutcome = 'signed' | 'already-signed';

export interface EncounterSource {
  load(): Promise<EncounterData | null>;
  create?: (appointmentId: string) => Promise<string>;
  save?: (noteId: string, soap: Soap) => Promise<void>;
  /** Signing writes to the student's vault and to the ledger. */
  sign?: (noteId: string) => Promise<SignOutcome>;
}

/** 409 from PATCH: the note was signed somewhere else, so this edit did not land. */
export class SignedElsewhere extends Error {}

export function encounterApiSource(request: Request = apiRequest): EncounterSource {
  return {
    async load() {
      const [notes, appointments] = await Promise.all([
        request<{ items: EncounterNoteApi[] }>('/encounters'),
        careAppointments(request),
      ]);
      return { notes: notes.items, appointments };
    },
    async create(appointmentId) {
      const res = await request<{ id: string }>('/encounters', { method: 'POST', body: JSON.stringify({ appointmentId }) });
      return res.id;
    },
    async save(noteId, soap) {
      try {
        await request(`/encounters/${encodeURIComponent(noteId)}`, { method: 'PATCH', body: JSON.stringify(soap) });
      } catch (reason) {
        if (reason instanceof ApiError && reason.status === 409) throw new SignedElsewhere();
        throw reason;
      }
    },
    async sign(noteId) {
      try {
        await request(`/encounters/${encodeURIComponent(noteId)}/finalize`, { method: 'POST' });
        return 'signed';
      } catch (reason) {
        if (reason instanceof ApiError && reason.status === 409) return 'already-signed';
        throw reason;
      }
    },
  };
}
