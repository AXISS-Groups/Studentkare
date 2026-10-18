import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { apiRequest } from '@/data/services/http';
import { PermissionsView } from '../PermissionsView';
import { onboardEn } from '@/i18n/areas/onboard';
import { en } from '@/i18n/en';

vi.mock('@/data/services/http', () => ({ apiRequest: vi.fn() }));
const mocked = vi.mocked(apiRequest);

const SERVER = {
  emailEnabled: true,
  pushEnabled: true,
  remindersEnabled: true,
  pickupLocationEnabled: false,
  ayushHistoryEnabled: false,
  timezone: 'Asia/Kolkata',
  quietStart: '22:00',
  quietEnd: '08:00',
};

const onDone = vi.fn();

async function open(overrides: Partial<typeof SERVER> = {}) {
  mocked.mockResolvedValueOnce({ ...SERVER, ...overrides } as never);
  render(<PermissionsView onDone={onDone} />);
  // The switches render before the fetch resolves, so waiting for one to
  // appear is not waiting for the stored choices to be applied. Flush the
  // resolved promise and the effect it triggers instead of racing them.
  await act(async () => {
    await Promise.resolve();
  });
}

const sw = (title: string) => screen.getByRole('switch', { name: title });
const body = () => {
  const calls = mocked.mock.calls;
  return JSON.parse(String(calls[calls.length - 1]?.[1]?.body));
};

beforeEach(() => {
  mocked.mockReset();
  onDone.mockReset();
});

describe('crisis alerts are not a switch', () => {
  it('states that they are always on', async () => {
    // Urgent events bypass notification preferences entirely. A switch here
    // would be a control that silently does nothing, on the one screen where
    // that is least acceptable.
    await open();
    expect(screen.getByText(en['always.title'])).toBeInTheDocument();
    expect(screen.getByText(/^always on\./i)).toBeInTheDocument();
  });

  it('offers no switch for them', async () => {
    await open();
    expect(screen.queryByRole('switch', { name: /crisis/i })).toBeNull();
    expect(screen.getAllByRole('switch')).toHaveLength(2);
  });
});

describe('the choices', () => {
  it('shows what the server already holds', async () => {
    await open({ remindersEnabled: false });
    expect(sw('Consult and dose reminders')).not.toBeChecked();
  });

  it('starts reminders on, as the lede says', async () => {
    await open();
    expect(sw('Consult and dose reminders')).toBeChecked();
    expect(screen.getByText(onboardEn['onboard.perm.lede'])).toBeInTheDocument();
  });

  it('saves what was chosen', async () => {
    await open();
    fireEvent.click(sw('Consult and dose reminders'));
    mocked.mockResolvedValueOnce({ success: true } as never);
    fireEvent.click(screen.getByRole('button', { name: /finish setup/i }));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(body().remindersEnabled).toBe(false);
  });

  it('sends back the settings it does not show, rather than resetting them', async () => {
    // PUT replaces the whole object. Quiet hours and the email channel are set
    // elsewhere; finishing setup must not silently undo them.
    await open({ quietStart: '23:30', emailEnabled: false, pickupLocationEnabled: true });
    mocked.mockResolvedValueOnce({ success: true } as never);
    fireEvent.click(screen.getByRole('button', { name: /finish setup/i }));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(body().quietStart).toBe('23:30');
    expect(body().emailEnabled).toBe(false);
    expect(body().pickupLocationEnabled).toBe(true);
  });

  it('lets the student move on without choosing', async () => {
    await open();
    fireEvent.click(screen.getByRole('button', { name: /not now/i }));
    expect(onDone).toHaveBeenCalled();
  });
});

describe('Ayush chat history', () => {
  // Enforced on the server: off means a chat's words are not stored.
  it('is a real switch, off unless the student turned it on', async () => {
    await open();
    expect(sw(onboardEn['onboard.perm.ayush.title'])).not.toBeChecked();
    expect(sw(onboardEn['onboard.perm.ayush.title'])).toHaveAccessibleDescription(onboardEn['onboard.perm.ayush.detail']);
  });

  it('saves the choice', async () => {
    await open();
    fireEvent.click(sw(onboardEn['onboard.perm.ayush.title']));
    mocked.mockResolvedValueOnce({ success: true } as never);
    fireEvent.click(screen.getByRole('button', { name: /finish setup/i }));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(body().ayushHistoryEnabled).toBe(true);
  });

  it('says that turning it off deletes what was kept', () => {
    expect(onboardEn['onboard.perm.ayush.detail']).toMatch(/deletes the chats already kept/);
  });
});

describe('choices the server does not act on', () => {
  // pickupLocationEnabled is stored but nothing on the server reads it. A
  // switch would be a control that silently does nothing.
  it('offers no switch for pickup location', async () => {
    await open();
    expect(screen.queryByRole('switch', { name: /pickup/i })).toBeNull();
  });

  it('does not call Ayush "AI" or promise a counsellor is alerted', async () => {
    await open();
    expect(document.body.textContent).not.toMatch(/Ayush AI|counsellor/i);
  });
});

describe('when the current choices cannot be loaded', () => {
  it('says so and does not let anything be saved', async () => {
    // Showing every switch as off would be a claim about their settings.
    mocked.mockRejectedValueOnce(new Error('offline'));
    render(<PermissionsView onDone={onDone} />);
    await screen.findByRole('alert');
    expect(screen.getByRole('button', { name: /finish setup/i })).toBeDisabled();
    for (const control of screen.getAllByRole('switch')) expect(control).toBeDisabled();
  });
});

describe('accessibility', () => {
  it('uses real switches, each named and described', async () => {
    await open();
    const control = sw(onboardEn['onboard.perm.reminders.title']);
    expect(control).toHaveAttribute('aria-checked');
    expect(control).toHaveAccessibleDescription(onboardEn['onboard.perm.reminders.detail']);
  });

  it('names every button and hides decorative icons', async () => {
    const { container } = await open().then(() => ({ container: document.body }));
    for (const control of screen.getAllByRole('button')) {
      expect(control).toHaveAccessibleName();
    }
    for (const svg of container.querySelectorAll('svg')) {
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    }
  });
});
