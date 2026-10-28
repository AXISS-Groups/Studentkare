/** What the Permissions screen offers, and what it refuses to offer.
 *
 * Kept out of the view so the copy can be read by a test and translated later,
 * and so the one non-negotiable entry is stated in data rather than buried in
 * markup.
 */

export interface PermissionChoice {
  /** The field on GET/PUT /notifications/preferences. */
  key: 'remindersEnabled' | 'pickupLocationEnabled' | 'ayushHistoryEnabled';
  title: string;
  detail: string;
}

/**
 * The design draws four switches. Only three of them are switches.
 *
 * "Crisis alerts and SOS" is the fourth, and it is not here: urgent events
 * bypass notification preferences entirely (see URGENT_EVENT_TYPES in
 * workflow_scheduler), so a switch would be a control that silently does
 * nothing, on the one screen where that is least acceptable. It is stated
 * instead — see ALWAYS_ON.
 */
export const PERMISSION_CHOICES: readonly PermissionChoice[] = [
  {
    key: 'remindersEnabled',
    title: 'Consult and dose reminders',
    detail: 'Notifications before appointments and at medication times.',
  },
  {
    key: 'pickupLocationEnabled',
    title: 'Dorm pickup location',
    detail: 'Shares your block with the phlebotomist on the day of a sample pickup only.',
  },
  {
    key: 'ayushHistoryEnabled',
    title: 'Ayush AI history',
    detail: 'Keeps past symptom chats so Ayush can follow up. Delete any time.',
  },
] as const;

export const ALWAYS_ON = {
  title: 'Crisis alerts and SOS',
  detail:
    'Always on. Crisis alerts reach your counsellor and emergency contact even when ' +
    'everything else here is off, and at any hour.',
} as const;

/** The two consents start withheld; the reminder preference starts on. */
export const DEFAULT_CHOICES: Record<PermissionChoice['key'], boolean> = {
  remindersEnabled: true,
  pickupLocationEnabled: false,
  ayushHistoryEnabled: false,
};
