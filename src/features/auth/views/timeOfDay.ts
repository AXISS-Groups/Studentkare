/** The splash greets by the clock (design page 1, Main).
 *
 * Kept pure and separate so the boundaries can be tested without a fake clock
 * in a component, and so the greeting can be translated on its own later.
 */

export type TimeOfDay = 'morning' | 'afternoon' | 'evening';

export const MORNING_ENDS = 12;
export const AFTERNOON_ENDS = 17;

export function timeOfDay(at: Date = new Date()): TimeOfDay {
  const hour = at.getHours();
  if (hour < MORNING_ENDS) return 'morning';
  if (hour < AFTERNOON_ENDS) return 'afternoon';
  return 'evening';
}

const GREETING: Record<TimeOfDay, string> = {
  morning: 'Good morning',
  afternoon: 'Good afternoon',
  evening: 'Good evening',
};

export function greeting(part: TimeOfDay): string {
  return GREETING[part];
}
