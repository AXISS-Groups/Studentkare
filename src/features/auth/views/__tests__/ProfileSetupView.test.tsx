import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { apiRequest } from '@/data/http';
import { ProfileSetupView } from '../ProfileSetupView';

vi.mock('@/data/http', () => ({ apiRequest: vi.fn() }));
const mocked = vi.mocked(apiRequest);

const SERVER = { hostelBlock: '', room: '', bloodGroup: '', emergencyContactPhone: '' };
const onDone = vi.fn();

async function open(overrides: Partial<typeof SERVER> = {}) {
  mocked.mockResolvedValueOnce({ ...SERVER, ...overrides } as never);
  render(<ProfileSetupView onDone={onDone} />);
  // Waiting for the request to be *made* is not waiting for it to land — the
  // effect that fills the form runs after. Typing before that flush would be
  // overwritten by the server values.
  await act(async () => {
    await Promise.resolve();
  });
}

const body = () => {
  const calls = mocked.mock.calls;
  return JSON.parse(String(calls[calls.length - 1]?.[1]?.body));
};

const save = () => fireEvent.click(screen.getByRole('button', { name: /^continue$/i }));

beforeEach(() => {
  mocked.mockReset();
  onDone.mockReset();
});

describe('where to find a student', () => {
  it('saves what was entered', async () => {
    await open();
    fireEvent.change(screen.getByLabelText(/hostel block/i), {
      target: { value: 'North Dorm, Block B' },
    });
    fireEvent.change(screen.getByLabelText(/^room$/i), { target: { value: 'B-214' } });
    mocked.mockResolvedValueOnce({} as never);
    save();

    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(body()).toMatchObject({ hostelBlock: 'North Dorm, Block B', room: 'B-214' });
  });

  it('shows what is already stored rather than blanking it', async () => {
    await open({ hostelBlock: 'South Dorm', bloodGroup: 'O+' });
    await waitFor(() => expect(screen.getByLabelText(/hostel block/i)).toHaveValue('South Dorm'));
    expect(screen.getByLabelText(/blood group/i)).toHaveValue('O+');
  });
});

describe('nothing here is required', () => {
  it('lets a student continue having filled in nothing', async () => {
    // The screen itself offers "I'll add this later", so the form must not
    // enforce what the design says can be skipped.
    await open();
    mocked.mockResolvedValueOnce({} as never);
    save();
    await waitFor(() => expect(onDone).toHaveBeenCalled());
  });

  it('lets a student skip without writing anything at all', async () => {
    await open();
    mocked.mockClear();
    fireEvent.click(screen.getByRole('button', { name: /add this later/i }));
    expect(onDone).toHaveBeenCalled();
    expect(mocked).not.toHaveBeenCalled();
  });
});

describe('blood group', () => {
  it('offers "Not recorded" rather than defaulting to a group', async () => {
    // Inventing a blood group on an emergency-facing record is the defect
    // this codebase already had once, in the digital ID.
    await open();
    const select = screen.getByLabelText(/blood group/i);
    expect(select).toHaveValue('');
    expect(screen.getByRole('option', { name: 'Not recorded' })).toBeInTheDocument();
  });
});

describe('the emergency contact', () => {
  it('says when it would be used', async () => {
    await open();
    expect(screen.getByLabelText(/emergency contact/i)).toHaveAccessibleDescription(
      /only contacted if you trigger an SOS/i,
    );
  });
});

describe('accessibility', () => {
  it('labels every control and names every button', async () => {
    const { container } = await open().then(() => ({ container: document.body }));
    for (const field of ['hostel block', 'room', 'blood group', 'emergency contact']) {
      expect(screen.getByLabelText(new RegExp(field, 'i'))).toBeInTheDocument();
    }
    for (const control of screen.getAllByRole('button')) {
      expect(control).toHaveAccessibleName();
    }
    for (const svg of container.querySelectorAll('svg')) {
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    }
  });
});
