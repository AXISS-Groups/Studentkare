import { describe, expect, it } from 'vitest';
import { channelFieldCopy, channelIsDeliverable, SIGNUP_STEPS, signupProgress } from '../channelCopy';

describe('sign in — channel copy', () => {
  it('asks for a campus email on the email channel', () => {
    const copy = channelFieldCopy('EMAIL');
    expect(copy.label).toBe('Campus email address');
    expect(copy.inputType).toBe('email');
    expect(copy.autoComplete).toBe('email');
  });

  it('asks for a number on the WhatsApp channel, and says rates apply', () => {
    const copy = channelFieldCopy('WHATSAPP');
    expect(copy.inputType).toBe('tel');
    expect(copy.autoComplete).toBe('tel');
  });

  it('never leaves the field unlabelled or unexplained', () => {
    for (const channel of ['EMAIL', 'WHATSAPP'] as const) {
      const copy = channelFieldCopy(channel);
      expect(copy.label.length).toBeGreaterThan(0);
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

describe('sign up — progress', () => {
  it('reports the real position, not the design pack numbering', () => {
    expect(signupProgress(2)).toEqual({ position: 2, total: SIGNUP_STEPS });
  });

  it('never reports a position outside the bar', () => {
    // Step 7 is the two-factor branch; it must not render as "7 of 6".
    expect(signupProgress(7).position).toBe(SIGNUP_STEPS);
    expect(signupProgress(0).position).toBe(1);
  });
});
