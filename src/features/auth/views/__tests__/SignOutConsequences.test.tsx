import { describe, expect, it } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { SignOutConsequences } from '../SignOutConsequences';

describe('what it refuses to claim', () => {
  it('does not promise anything is removed from the device', () => {
    // Signing out clears the session and nothing else.
    render(<SignOutConsequences />);
    expect(document.body.textContent).not.toMatch(
      /removed from this (phone|device)|offline emergency card|wiped|erased/i,
    );
  });

  it('does not claim reminders stop', () => {
    // They are delivered by WhatsApp and email, not to a device.
    render(<SignOutConsequences />);
    expect(document.body.textContent).not.toMatch(/reminders stop|stop on this device/i);
  });

  it('says the opposite', () => {
    render(<SignOutConsequences />);
    expect(screen.getByText(/reminders keep arriving/i)).toBeInTheDocument();
  });
});
