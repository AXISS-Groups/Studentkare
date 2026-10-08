import type { AccountRole } from '@/data/types/workflowTypes';

/** What the native home offers each role. Staff consoles live on the web. */
export interface Destination {
  route: string;
  label: string;
  hint: string;
}

const STUDENT: readonly Destination[] = [
  { route: 'Vault', label: 'Health records', hint: 'Reports, prescriptions and documents' },
  { route: 'Appointments', label: 'Appointments', hint: 'Book and manage visits' },
  { route: 'Teleconsult', label: 'Video consult', hint: 'See a doctor from your room' },
  { route: 'AiChat', label: 'Ask Ayush', hint: 'Describe how you feel' },
  { route: 'Marketplace', label: 'Medicines and lab tests', hint: 'Prices shown before you book' },
  { route: 'DigitalId', label: 'Digital health ID', hint: 'Your ID card' },
  { route: 'LifeShare', label: 'Care circle', hint: 'People you share records with' },
  { route: 'Claims', label: 'Cover and claims', hint: 'Insurance and reimbursements' },
  { route: 'MyRequests', label: 'My requests', hint: 'Orders, returns, hostel visits and refills' },
  { route: 'Notifications', label: 'Notifications', hint: 'Updates on your requests' },
  { route: 'NotificationSettings', label: 'Notification settings', hint: 'What we send and when' },
  { route: 'LeaveCampus', label: 'Leaving campus', hint: 'Graduating, moving or taking a break' },
  { route: 'LostPhone', label: 'Lost a phone?', hint: 'Sign out of every other device' },
  { route: 'DeleteAccount', label: 'Delete my account', hint: 'What happens, and 7 days to change your mind' },
];

const DOCTOR: readonly Destination[] = [
  { route: 'ClinicianConsole', label: 'Clinician console', hint: "Today's patients and reviews" },
  { route: 'Notifications', label: 'Notifications', hint: 'Updates on your queue' },
];

export function destinationsFor(role: AccountRole): readonly Destination[] {
  if (role === 'STUDENT') return STUDENT;
  if (role === 'NMC_DOCTOR') return DOCTOR;
  return [];
}
