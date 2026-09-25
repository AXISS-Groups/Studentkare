import { describe, expect, it } from 'vitest';
import { channelIsDeliverable, signInFieldCopy } from '../SignInView';

describe('sign in — channel copy', () => {
  it('asks for a campus email on the email channel', () => {
    const copy = signInFieldCopy('EMAIL');
    expect(copy.label).toBe('Campus email address');
    expect(copy.inputType).toBe('email');
    expect(copy.autoComplete).toBe('email');
  });

  it('asks for a number on the WhatsApp channel, and says rates apply', () => {
    const copy = signInFieldCopy('WHATSAPP');
    expect(copy.inputType).toBe('tel');
    expect(copy.autoComplete).toBe('tel');
    expect(copy.hint).toMatch(/rates apply/i);
  });

  it('never leaves the field unlabelled or unexplained', () => {
    for (const channel of ['EMAIL', 'WHATSAPP'] as const) {
      const copy = signInFieldCopy(channel);
      expect(copy.label.length).toBeGreaterThan(0);
      expect(copy.hint.length).toBeGreaterThan(0);
      expect(copy.placeholder.length).toBeGreaterThan(0);
    }
  });
});

describe('sign in — deliverability', () => {
  it('allows a channel the server listed', () => {
    expect(channelIsDeliverable('EMAIL', ['EMAIL', 'WHATSAPP'])).toBe(true);
  });

  it('blocks a channel the server did not list', () => {
    expect(channelIsDeliverable('WHATSAPP', ['EMAIL'])).toBe(false);
  });

  it('does not block before the server has answered', () => {
    // An empty list means options have not loaded yet, not that nothing works.
    // Treating it as "nothing is deliverable" would disable sign-in on a slow
    // network, which is a worse failure than letting the send attempt answer.
    expect(channelIsDeliverable('EMAIL', [])).toBe(true);
    expect(channelIsDeliverable('WHATSAPP', [])).toBe(true);
  });
});
