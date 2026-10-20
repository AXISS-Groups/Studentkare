import type { AccountRole } from '@/data/types/workflowTypes';
import type { MessageKey } from '@/i18n';

/**
 * What the native home offers each role. Staff consoles live on the web.
 * A destination is its route; its label and hint are the i18n keys
 * `dest.<route>.label` and `dest.<route>.hint` (AGENTS.md rule 11), which the
 * type below makes the compiler check exist.
 */
export type DestinationRoute =
  | 'Vault' | 'Appointments' | 'MedicineReminders' | 'Teleconsult' | 'AiChat' | 'Marketplace' | 'DigitalId'
  | 'MyRequests' | 'Orders' | 'Search' | 'Notifications' | 'NotificationSettings' | 'Appearance' | 'Rewards' | 'LeaveCampus' | 'LostPhone'
  | 'DeleteAccount' | 'ClinicianConsole';

export interface Destination {
  route: DestinationRoute;
  label: `dest.${DestinationRoute}.label` & MessageKey;
  hint: `dest.${DestinationRoute}.hint` & MessageKey;
}

function destination<R extends DestinationRoute>(route: R): Destination {
  return { route, label: `dest.${route}.label`, hint: `dest.${route}.hint` };
}

const STUDENT: readonly Destination[] = ([
  'Vault', 'Appointments', 'MedicineReminders', 'Teleconsult', 'AiChat', 'Marketplace', 'Search', 'Orders', 'DigitalId', 'MyRequests',
  'Notifications', 'NotificationSettings', 'Appearance', 'Rewards', 'LeaveCampus', 'LostPhone', 'DeleteAccount',
] as const).map(destination);

const DOCTOR: readonly Destination[] = (['ClinicianConsole', 'Notifications', 'Appearance'] as const).map(destination);

export function destinationsFor(role: AccountRole): readonly Destination[] {
  if (role === 'STUDENT') return STUDENT;
  if (role === 'NMC_DOCTOR') return DOCTOR;
  return [];
}
