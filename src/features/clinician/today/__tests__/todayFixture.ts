import type { TodayData } from '../todayModel';

/** Test fixture only: a day as a fuller source would report it (none does yet). */
export function fullDay(now: Date): TodayData {
  return {
    date: now,
    queueOpensAt: '10:00',
    campHours: 2,
    slots: [
      { id: 's1', time: '09:30', kind: 'done', title: 'Kavya Iyer', meta: 'Video · acne review', sharing: 'shared' },
      { id: 's2', time: '10:00', kind: 'next', title: 'Rohan Varma', meta: 'Video · fever 3 days', sharing: 'shared' },
      { id: 's3', time: '10:20', kind: 'chat', title: 'Arjun Nair', meta: 'Chat · allergy query', sharing: 'not-shared' },
      { id: 's4', time: '10:40', kind: 'break', title: 'Break' },
      { id: 's5', time: '12:00', kind: 'open', title: 'Open slot', meta: 'Bookable' },
    ],
    next: { appointmentId: 'a2', patientName: 'Rohan Varma', summary: 'Video · fever 3 days', startsAt: new Date(now.getTime() + 14 * 60_000), recordsShared: 3 },
    waiting: { criticalResults: { count: 1 }, reportsToSign: { count: 3 }, followUps: { count: 4 }, renewals: { count: 2 } },
    camp: { title: 'Camp duty', when: 'Block C flu camp · Sat 8:00–10:00', note: 'You are the supervising doctor.' },
    availability: 'taking',
  };
}
