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

describe('the SignOut / WebSignOut boards inside the shared confirm dialog', () => {
  it('shows who is signed in, with the contact masked', () => {
    render(<SignOutConsequences where="device" account={{ name: 'Asha Rao', contact: 'asha@vnrvjiet.in' }} />);
    expect(screen.getByText('Signed in as Asha Rao')).toBeInTheDocument();
    expect(screen.getByText('a•••••@vnrvjiet.in')).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('asha@vnrvjiet.in');
  });

  it('marks what stays with a tick and what ends with a cross, each named', () => {
    render(<SignOutConsequences where="browser" />);
    expect(screen.getAllByRole('img', { name: 'Stays' })).toHaveLength(3);
    expect(screen.getAllByRole('img', { name: 'Ends' })).toHaveLength(1);
    expect(document.querySelector('[data-icon="check"]')).not.toBeNull();
    expect(document.querySelector('[data-icon="x"]')).not.toBeNull();
    expect(screen.getByText(/this browser forgets your session/i)).toBeInTheDocument();
    expect(screen.getByText(/downloads already saved/i)).toBeInTheDocument();
  });

  it('on a device, still claims nothing is removed and reminders keep coming', () => {
    render(<SignOutConsequences where="device" />);
    expect(document.body.textContent).not.toMatch(/offline emergency card|reminders stop|stop on this device|wiped/i);
    expect(screen.getByText(/reminders keep arriving/i)).toBeInTheDocument();
    expect(screen.getByText(/never deletes anything/i)).toBeInTheDocument();
  });
});
