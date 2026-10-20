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
  | 'MyRequests' | 'Notifications' | 'NotificationSettings' | 'Appearance' | 'LeaveCampus' | 'LostPhone'
  | 'DeleteAccount' | 'ClinicianConsole';

export interface Destination {
  route: DestinationRoute;
  label: `dest.${DestinationRoute}.label` & MessageKey;
  hint: `dest.${DestinationRoute}.hint` & MessageKey;
}

function destination<R extends DestinationRoute>(route: R): Destination {
  return { route, label: `dest.${route}.label`, hint: `dest.${route}.hint` };
}

const STUDENT: readonly Destination[] = [
  { route: 'Vault', label: 'Health records', hint: 'Your documents, and who can see them' },
  { route: 'Appointments', label: 'Appointments', hint: 'Book and manage visits' },
  { route: 'MedicineReminders', label: 'Medicine reminders', hint: 'A daily reminder on this phone' },
  { route: 'Teleconsult', label: 'Video consult', hint: 'Not available yet' },
  { route: 'AiChat', label: 'Ask Ayush', hint: 'Describe how you feel' },
  { route: 'Marketplace', label: 'Medicines and lab tests', hint: 'Prices shown before you book' },
  { route: 'DigitalId', label: 'Digital health ID', hint: 'Your ID card' },
  { route: 'MyRequests', label: 'My requests', hint: 'Orders, returns, hostel visits and refills' },
  { route: 'Notifications', label: 'Notifications', hint: 'Updates on your requests' },
  { route: 'NotificationSettings', label: 'Notification settings', hint: 'What we send and when' },
  { route: 'Rewards', label: 'Invite friends', hint: 'Share your code, see your points and medals' },
  { route: 'LeaveCampus', label: 'Leaving campus', hint: 'Graduating, moving or taking a break' },
  { route: 'LostPhone', label: 'Lost a phone?', hint: 'Sign out of every other device' },
  { route: 'DeleteAccount', label: 'Delete my account', hint: 'What happens, and 7 days to change your mind' },
];

const DOCTOR: readonly Destination[] = (['ClinicianConsole', 'Notifications', 'Appearance'] as const).map(destination);

export function destinationsFor(role: AccountRole): readonly Destination[] {
  if (role === 'STUDENT') return STUDENT;
  if (role === 'NMC_DOCTOR') return DOCTOR;
  return [];
}
