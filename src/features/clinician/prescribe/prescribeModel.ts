import { ApiError, apiRequest } from '@/data/services/http';
import { careAppointments } from '../shared/clinicalData';
import type { CareAppointment, Request } from '../shared/clinicalData';

/**
 * Prescribe (design page 5, Tier 1, approved 2026-10-21) on the real
 * `POST /prescriptions` contract. Pure rules here so they can be tested on
 * their own.
 *
 * - The patient comes from the doctor's own confirmed or completed
 *   appointments; the server refuses anyone else.
 * - The allergy check runs on the server against the student's record (the
 *   doctor's browser never reads the allergy list). It compares NAMES only:
 *   no substance code is sent, so cross-reactivity is not checked, and the
 *   screen says so every time it blocks.
 * - A drug the check refuses stays on screen, struck through with the
 *   reason, and is never sent again. This screen never sends the server's
 *   "acknowledge the conflict" override.
 */

export type DrugSchedule = 'OTC' | 'H' | 'H1' | 'X';
export const SCHEDULES: readonly DrugSchedule[] = ['OTC', 'H', 'H1', 'X'];

/** Server field limits (PrescriptionItemInput). */
export const RX_LIMITS = { generic: 160, strength: 60, form: 40, dose: 60, frequency: 60, durationDays: 365, quantity: 1000, lines: 20 } as const;

/** One drug as the doctor entered it (the board's "Add a drug"). */
export interface DrugEntry {
  genericName: string;
  brandName: string;
  strength: string;
  form: string;
  dose: string;
  frequency: string;
  durationDays: number;
  quantity: number;
  scheduleClass: DrugSchedule;
  substitutionAllowed: boolean;
}

export interface RxLine extends DrugEntry {
  id: string;
  /** Set when a check refused it; the line stays, struck through, with why. */
  blocked?: { kind: 'allergy'; substances: string[] } | { kind: 'schedule-x' };
}

/** GET /encounters, the fields Prescribe needs to link a note. */
export interface PrescriberNote {
  id: string;
  appointmentId: string;
  patientId: string;
  status: string;
  createdAt: number;
}

export interface PrescribeData {
  /** Confirmed or completed appointments: who may be prescribed for. */
  appointments: CareAppointment[];
  /** This doctor's notes; null when they could not be read (prescribing stays possible, unlinked). */
  notes: PrescriberNote[] | null;
}

/** 409 from POST /prescriptions: which drugs matched which recorded allergy. */
export interface AllergyConflict {
  genericName: string;
  conflicts: { substance: string; flag: string }[];
}

export interface IssueRequest {
  patientId: string;
  encounterId: string;
  lines: DrugEntry[];
}

export type IssueResult = { kind: 'issued'; id: string } | { kind: 'conflict'; conflicts: AllergyConflict[] };

export interface PrescribeSource {
  load(): Promise<PrescribeData | null>;
  issue?: (request: IssueRequest) => Promise<IssueResult>;
}

/**
 * Why a line may not be sent from here, before the server sees it. Schedule
 * X is never prescribed by video (Telemedicine Practice Guidelines 2020); the
 * appointment does not report whether this consult is in person, so the rule
 * fails closed and treats it as video.
 */
export function localBlock(entry: Pick<DrugEntry, 'scheduleClass'>): RxLine['blocked'] {
  return entry.scheduleClass === 'X' ? { kind: 'schedule-x' } : undefined;
}

/** A line is complete when the server would accept it and a pharmacist can fill it. */
export function lineComplete(line: DrugEntry): boolean {
  return line.genericName.trim().length >= 2
    && line.dose.trim().length > 0 && line.frequency.trim().length > 0
    && line.durationDays >= 1 && line.durationDays <= RX_LIMITS.durationDays
    && line.quantity >= 1 && line.quantity <= RX_LIMITS.quantity;
}

/** Marks every line a 409 named, by generic name (as the server matched it). */
export function applyConflicts(lines: RxLine[], conflicts: AllergyConflict[]): RxLine[] {
  return lines.map((line) => {
    const hit = conflicts.find((c) => c.genericName.trim().toLowerCase() === line.genericName.trim().toLowerCase());
    return hit ? { ...line, blocked: { kind: 'allergy', substances: hit.conflicts.map((c) => c.substance) } } : line;
  });
}

function isConflictDetail(detail: unknown): detail is { conflicts: AllergyConflict[] } {
  return typeof detail === 'object' && detail !== null && Array.isArray((detail as { conflicts?: unknown }).conflicts);
}

export function prescribeApiSource(request: Request = apiRequest): PrescribeSource {
  return {
    async load() {
      // Notes only link the prescription; if they can't load, prescribing still works, unlinked.
      const notes = request<{ items: PrescriberNote[] }>('/encounters').then((r) => r.items, () => null);
      const appointments = await careAppointments(request);
      return { appointments, notes: await notes };
    },
    async issue({ patientId, encounterId, lines }) {
      try {
        const issued = await request<{ id: string }>('/prescriptions', {
          method: 'POST',
          body: JSON.stringify({
            patientId,
            ...(encounterId ? { encounterId } : {}),
            items: lines.map((l) => ({
              genericName: l.genericName.trim(), brandName: l.brandName.trim(), strength: l.strength.trim(), form: l.form.trim(),
              dose: l.dose.trim(), frequency: l.frequency.trim(), durationDays: l.durationDays, quantity: l.quantity,
              substitutionAllowed: l.substitutionAllowed, scheduleClass: l.scheduleClass,
            })),
            // Never an override from this screen: a conflict blocks the drug.
            acknowledgeAllergyConflict: false,
          }),
        });
        return { kind: 'issued', id: issued.id };
      } catch (reason) {
        if (reason instanceof ApiError && reason.status === 409 && isConflictDetail(reason.detail)) {
          return { kind: 'conflict', conflicts: reason.detail.conflicts };
        }
        throw reason;
      }
    },
  };
}
