/**
 * M04 Emergency Domain Model.
 * Pure TypeScript entity, type definitions, and invariants.
 * Data Class: clinical. No react, no fetch, no platform imports.
 *
 * Mirrors backend/services/emergency_api.py. There is no ambulance or driver
 * here: the platform does not dispatch vehicles, it alerts people, and every
 * attempt carries its real outcome.
 */

/** Client-side flow: IDLE → COUNTDOWN (cancellable) → SENDING → OPEN | FAILED; CLOSED once resolved/cancelled. */
export type EmergencyStatus = 'IDLE' | 'COUNTDOWN' | 'SENDING' | 'OPEN' | 'FAILED' | 'CLOSED';

export type SosAlertStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'CANCELLED';
export type SosRecipientKind = 'CAMPUS_CONSOLE' | 'CAMPUS_SECURITY' | 'EMERGENCY_CONTACT';
export type SosDeliveryStatus = 'SENT' | 'FAILED' | 'SKIPPED';

export interface SosDelivery {
  recipientKind: SosRecipientKind;
  channel: 'CONSOLE' | 'WHATSAPP';
  /** A name, never a phone number. */
  recipient: string;
  status: SosDeliveryStatus;
  detail: string;
}

export interface SosAlert {
  id: string;
  status: SosAlertStatus;
  campus: string;
  locationNote: string | null;
  createdAt: number;
  acknowledgedAt: number | null;
  resolvedAt: number | null;
  cancelledAt: number | null;
  resolutionNote: string | null;
  deliveries: SosDelivery[];
}

export function isEmergencyActive(status: EmergencyStatus): boolean {
  return status === 'COUNTDOWN' || status === 'SENDING' || status === 'OPEN';
}

export function isAlertOpen(alert: SosAlert | null): boolean {
  return alert !== null && (alert.status === 'ACTIVE' || alert.status === 'ACKNOWLEDGED');
}

/** True only if at least one person or console was actually reached. */
export function anyoneReached(alert: SosAlert): boolean {
  return alert.deliveries.some((d) => d.status === 'SENT');
}
