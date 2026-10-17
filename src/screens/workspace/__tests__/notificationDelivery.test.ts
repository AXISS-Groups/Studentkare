import { describe, expect, it } from 'vitest';
import { translate, type MessageKey, type Vars } from '@/i18n';
import { deliveryNote, type DeliveryState } from '../NotificationInboxPanel';

describe('notification delivery note', () => {
  it('explains a message held by quiet hours, without calling it a failure', () => {
    const note = deliveryNote('held', 'PENDING');
    expect(note.tone).toBe('info');
    expect(note.text).toMatch(/quiet hours/i);
  });

  it('names the setting that suppressed a message, so it can be changed', () => {
    expect(deliveryNote('suppressed_reminders', 'SUPPRESSED').text).toMatch(/reminders are switched off/i);
    expect(deliveryNote('suppressed_email', 'SUPPRESSED').text).toMatch(/email is switched off/i);
  });

  it('says the appointment changed, not that a setting is off, when a reminder was not sent for it', () => {
    const cancelled = deliveryNote('suppressed_appointment_cancelled', 'SUPPRESSED');
    const passed = deliveryNote('suppressed_appointment_passed', 'SUPPRESSED');
    expect(cancelled.text).toBe('Not sent — the appointment was cancelled');
    expect(passed.text).toBe('Not sent — the appointment time had already passed');
    for (const note of [cancelled, passed]) {
      expect(note.text).not.toMatch(/setting/i);
    }
  });

  it('has Telugu and Hindi copy for the appointment reasons', () => {
    for (const lang of ['te', 'hi'] as const) {
      const t = (key: MessageKey, vars?: Vars) => translate(lang, key, vars);
      for (const state of ['suppressed_appointment_cancelled', 'suppressed_appointment_passed'] as const) {
        const { text } = deliveryNote(state, 'SUPPRESSED', t);
        expect(text.length).toBeGreaterThan(0);
        expect(text).not.toBe(deliveryNote(state, 'SUPPRESSED').text);
        expect(text).not.toMatch(/care\.inbox/);
      }
    }
  });

  it('owns a delivery failure rather than blaming the student', () => {
    // DESIGN.md section 7: say what went wrong, whose side it is on, what to do.
    const note = deliveryNote('failed', 'FAILED');
    expect(note.tone).toBe('danger');
    expect(note.text).toMatch(/on our side/i);
  });

  it('never shows a raw status string', () => {
    const states: DeliveryState[] = ['held', 'suppressed_reminders', 'suppressed_email', 'suppressed_appointment_cancelled',
      'suppressed_appointment_passed', 'suppressed', 'failed', 'pending'];
    for (const state of states) {
      const { text } = deliveryNote(state, 'SUPPRESSED');
      expect(text).not.toMatch(/SUPPRESSED|PENDING|FAILED/);
      expect(text.length).toBeGreaterThan(0);
    }
  });

  it('falls back safely when the server has no delivery field', () => {
    // An older row, or a deploy where the API is behind the app.
    expect(deliveryNote(undefined, 'PENDING').text).toBe('Queued for delivery');
    expect(deliveryNote(undefined, 'SUPPRESSED').text).toBe('');
  });
});
