import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { apiRequest } from '@/data/http';
import { PermissionsView } from '../PermissionsView';
import { ALWAYS_ON, PERMISSION_CHOICES } from '../permissionChoices';

vi.mock('@/data/http', () => ({ apiRequest: vi.fn() }));
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
  await screen.findByRole('switch', { name: PERMISSION_CHOICES[0].title });
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
    expect(screen.getByText(ALWAYS_ON.title)).toBeInTheDocument();
    expect(screen.getByText(/always on/i)).toBeInTheDocument();
  });

  it('offers no switch for them', async () => {
    await open();
    expect(screen.queryByRole('switch', { name: /crisis/i })).toBeNull();
    expect(screen.getAllByRole('switch')).toHaveLength(PERMISSION_CHOICES.length);
  });
});

describe('the choices', () => {
  it('shows what the server already holds', async () => {
    await open({ pickupLocationEnabled: true });
    expect(sw('Dorm pickup location')).toBeChecked();
    expect(sw('Ayush AI history')).not.toBeChecked();
  });

  it('starts the two consents off', async () => {
    await open();
    expect(sw('Dorm pickup location')).not.toBeChecked();
    expect(sw('Ayush AI history')).not.toBeChecked();
  });

  it('toggles one without touching the others', async () => {
    await open();
    fireEvent.click(sw('Ayush AI history'));
    expect(sw('Ayush AI history')).toBeChecked();
    expect(sw('Dorm pickup location')).not.toBeChecked();
  });

  it('saves what was chosen', async () => {
    await open();
    fireEvent.click(sw('Dorm pickup location'));
    mocked.mockResolvedValueOnce({ success: true } as never);
    fireEvent.click(screen.getByRole('button', { name: /finish setup/i }));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(body().pickupLocationEnabled).toBe(true);
  });

  it('sends back the settings it does not show, rather than resetting them', async () => {
    // PUT replaces the whole object. Quiet hours and the email channel are set
    // elsewhere; finishing setup must not silently undo them.
    await open({ quietStart: '23:30', emailEnabled: false });
    mocked.mockResolvedValueOnce({ success: true } as never);
    fireEvent.click(screen.getByRole('button', { name: /finish setup/i }));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(body().quietStart).toBe('23:30');
    expect(body().emailEnabled).toBe(false);
  });

  it('lets the student move on without choosing', async () => {
    await open();
    fireEvent.click(screen.getByRole('button', { name: /not now/i }));
    expect(onDone).toHaveBeenCalled();
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
    for (const choice of PERMISSION_CHOICES) {
      const control = sw(choice.title);
      expect(control).toHaveAttribute('aria-checked');
      expect(control).toHaveAccessibleDescription(choice.detail);
    }
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
